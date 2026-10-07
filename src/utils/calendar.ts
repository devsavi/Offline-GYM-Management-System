import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { WorkoutPlan } from '../types';

/**
 * Ensures calendar permissions are granted on the device.
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

/**
 * Finds or creates a dedicated local calendar for ApexGym workouts.
 * On Android and iOS, this syncs with the device's default account (e.g. Google Calendar).
 */
export async function getOrCreateGymCalendar(): Promise<string | null> {
  const hasPermission = await requestCalendarPermissions();
  if (!hasPermission) return null;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === 'GripState Workouts' || c.isPrimary);

  if (existing) {
    return existing.id;
  }

  // Create dedicated calendar if on iOS
  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    const newCalendarId = await Calendar.createCalendarAsync({
      title: 'GripState Workouts',
      color: '#10B981',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.source.id,
      source: defaultCalendar.source,
      name: 'GripState',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    return newCalendarId;
  }

  return calendars[0]?.id ?? null;
}

/**
 * Adds workout plan schedule as a calendar event/reminder.
 */
export async function addWorkoutPlanToCalendar(
  memberName: string,
  plan: Pick<WorkoutPlan, 'title' | 'start_date' | 'end_date' | 'notes'>
): Promise<string | null> {
  try {
    const calendarId = await getOrCreateGymCalendar();
    if (!calendarId) return null;

    const startDate = new Date(plan.start_date);
    const endDate = new Date(plan.end_date);

    // Default to a 1-hour session if single day, or span
    if (isNaN(startDate.getTime())) return null;

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `🏋️ ${plan.title} - ${memberName}`,
      startDate: startDate,
      endDate: isNaN(endDate.getTime()) ? new Date(startDate.getTime() + 60 * 60 * 1000) : endDate,
      notes: `GripState Workout Plan for ${memberName}.\n${plan.notes || ''}`,
      timeZone: 'UTC',
      alarms: [{ relativeOffset: -30 }], // 30 min reminder
    });

    return eventId;
  } catch (error) {
    console.warn('[Calendar] Could not create calendar event:', error);
    return null;
  }
}

/**
 * Generates a direct Google Calendar web/deep link URL that can be sent to members via WhatsApp/Email.
 */
export function generateGoogleCalendarUrl(
  title: string,
  startDateStr: string,
  endDateStr: string,
  details: string
): string {
  const start = startDateStr.replace(/-|:|\.\d\d\d/g, '');
  const end = endDateStr.replace(/-|:|\.\d\d\d/g, '');
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${start}/${end}&details=${encodeURIComponent(details)}`;
  return url;
}

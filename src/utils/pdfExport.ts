import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Member, WorkoutPlan } from '../types';

/**
 * Generates an ultra-clean, modern, branded PDF for a Workout Plan and prompts the user to share or print it.
 */
export async function exportWorkoutPlanPDF(
  member: Member,
  plan: WorkoutPlan,
  gymName: string = 'GripState Elite Training'
): Promise<void> {
  const exercisesHtml = (plan.exercises || [])
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px solid #E2E8F0; background: ${idx % 2 === 0 ? '#FFFFFF' : '#F9FBFA'};">
        <td style="padding: 12px 14px; font-weight: 600; color: #0F172A;">
          ${idx + 1}. ${item.exercise_name}
          ${item.notes ? `<div style="font-size: 11px; color: #64748B; font-weight: 400; margin-top: 2px;">${item.notes}</div>` : ''}
        </td>
        <td style="padding: 12px 14px; color: #0A3622;">
          <span style="background: #E6F4EA; color: #0A3622; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;">
            ${item.category}
          </span>
        </td>
        <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: #0F172A;">
          ${item.sets}
        </td>
        <td style="padding: 12px 14px; text-align: center; color: #0F172A; font-weight: 600;">
          ${item.reps}
        </td>
        <td style="padding: 12px 14px; text-align: center; color: #475569;">
          ${item.rest_time}s
        </td>
        <td style="padding: 12px 14px; text-align: right; font-weight: 600; color: #10B981;">
          ${item.target_weight || '-'}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${plan.title} - ${member.name}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 32px;
          color: #0F172A;
          background-color: #FFFFFF;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0A3622;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .logo-box {
          background: #0A3622;
          color: #FFFFFF;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: 0.5px;
          display: inline-block;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          background: #F4F7F5;
          padding: 18px 24px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .meta-item {
          font-size: 13px;
        }
        .meta-label {
          color: #64748B;
          font-weight: 500;
          margin-bottom: 2px;
        }
        .meta-val {
          font-weight: 700;
          color: #0F172A;
          font-size: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background: #0A3622;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 14px;
          text-align: left;
        }
        .footer {
          margin-top: 40px;
          border-top: 1px solid #E2E8F0;
          padding-top: 16px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #94A3B8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo-box">APEX GYM</div>
          <p style="margin: 6px 0 0; color: #64748B; font-size: 13px;">${gymName} • Personalized Workout Routine</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; color: #0A3622; font-size: 22px;">${plan.title}</h2>
          <span style="font-size: 12px; color: #10B981; font-weight: 700;">Status: Active Routine</span>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">MEMBER NAME</div>
          <div class="meta-val">${member.name}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">VALIDITY PERIOD</div>
          <div class="meta-val">${plan.start_date} → ${plan.end_date}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">CONTACT / PHONE</div>
          <div class="meta-val">${member.phone || 'N/A'}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">FITNESS GOAL</div>
          <div class="meta-val">${member.fitness_goals || 'General Fitness'}</div>
        </div>
      </div>

      ${plan.notes ? `<div style="background: #E6F4EA; border-left: 4px solid #10B981; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #0A3622; margin-bottom: 24px;"><strong>Trainer Notes:</strong> ${plan.notes}</div>` : ''}

      <table>
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Category</th>
            <th style="text-align: center;">Sets</th>
            <th style="text-align: center;">Reps</th>
            <th style="text-align: center;">Rest</th>
            <th style="text-align: right;">Load</th>
          </tr>
        </thead>
        <tbody>
          ${exercisesHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>Generated by GripState Offline Management System</div>
        <div>Keep hydrated & focus on proper form!</div>
      </div>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Share ${plan.title} - ${member.name}`,
    });
  }
}

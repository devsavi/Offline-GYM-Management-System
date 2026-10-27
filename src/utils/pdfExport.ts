import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Member, WorkoutPlan, PlanExerciseItem } from '../types';

/**
 * All categories use the app's mint-green chip color (matching catPill in colors.ts)
 */
function getCategoryBadgeStyle(_category: string): { bg: string; text: string; border: string } {
  return { bg: '#D1FAE5', text: '#0A3622', border: '#A7F3D0' };
}

/**
 * Resolve a public-folder image URI to an absolute URL for use inside the iframe.
 * On web, relative paths like "/exercises/chest/foo.webp" need the origin prepended.
 */
function resolveImageUrl(imageUri: string | undefined): string | null {
  if (!imageUri) return null;
  if (imageUri.startsWith('http://') || imageUri.startsWith('https://') || imageUri.startsWith('data:')) {
    return imageUri;
  }
  // Relative path — prepend origin so the iframe can load it
  if (typeof window !== 'undefined') {
    return window.location.origin + (imageUri.startsWith('/') ? imageUri : '/' + imageUri);
  }
  return imageUri;
}

interface PDFPageDefinition {
  dayKey: string;
  dayIndex: number;
  totalDays: number;
  pageIndexInDay: number;
  totalPagesInDay: number;
  exercises: PlanExerciseItem[];
  startIndexInDay: number;
  isMultiDay: boolean;
}

/**
 * Generates a clean, professional exercise PDF in a Grid View.
 * Top header:
 *   - Left: App logo & Location
 *   - Right: Member name
 * Below header:
 *   - Routine plan details & Day banner
 *   - Exercises rendered in a clean grid view (no description, no application UI buttons)
 * Multi-day and multi-page routines have accurately numbered pages and zero browser header/footer artifacts.
 */
export async function exportWorkoutPlanPDF(
  member: Partial<Member> | { name: string; phone?: string; fitness_goals?: string } | null | undefined,
  plan: WorkoutPlan,
  gymName: string = 'GripState Elite Training'
): Promise<void> {
  const exercises = plan.exercises || [];

  // Group exercises by day (e.g. "Day 1", "Day 2", etc.)
  const dayGroups = new Map<string, PlanExerciseItem[]>();
  if (exercises.length === 0) {
    dayGroups.set('Day 1', []);
  } else {
    for (const ex of exercises) {
      const rawDay = (ex.day_of_week && ex.day_of_week.trim()) ? ex.day_of_week.trim() : 'Day 1';
      if (!dayGroups.has(rawDay)) {
        dayGroups.set(rawDay, []);
      }
      dayGroups.get(rawDay)!.push(ex);
    }
  }

  const dayKeys = Array.from(dayGroups.keys());
  const isMultiDay = dayKeys.length > 1;
  const totalDays = dayKeys.length;

  // First page shows 6 exercises (to fit top header & banners),
  // subsequent pages show up to 9 exercises (3 rows x 3 columns)
  const FIRST_PAGE_MAX = 6;
  const OTHER_PAGE_MAX = 9;
  const pagesList: PDFPageDefinition[] = [];

  dayKeys.forEach((dayKey, dayIndex) => {
    const dayExercises = dayGroups.get(dayKey) || [];
    if (dayExercises.length === 0) {
      pagesList.push({
        dayKey,
        dayIndex,
        totalDays,
        pageIndexInDay: 0,
        totalPagesInDay: 1,
        exercises: [],
        startIndexInDay: 0,
        isMultiDay,
      });
    } else {
      let startIndex = 0;
      const dayChunks: { startIndex: number; exercises: PlanExerciseItem[] }[] = [];

      while (startIndex < dayExercises.length) {
        // Very first page of the entire document has index 0
        const isDocFirstPage = pagesList.length === 0 && dayChunks.length === 0;
        const capacity = isDocFirstPage ? FIRST_PAGE_MAX : OTHER_PAGE_MAX;
        const chunk = dayExercises.slice(startIndex, startIndex + capacity);
        dayChunks.push({
          startIndex,
          exercises: chunk,
        });
        startIndex += capacity;
      }

      const totalPagesInDay = dayChunks.length;
      dayChunks.forEach((chunk, pIndex) => {
        pagesList.push({
          dayKey,
          dayIndex,
          totalDays,
          pageIndexInDay: pIndex,
          totalPagesInDay,
          exercises: chunk.exercises,
          startIndexInDay: chunk.startIndex,
          isMultiDay,
        });
      });
    }
  });

  const totalPages = pagesList.length;

  // Build HTML pages for each chunk
  const pagesHtml = pagesList.map((pageDef, pageIndex) => {
    const globalPageNum = pageIndex + 1;
    const isLastPage = globalPageNum === totalPages;
    const isContinuation = pageDef.pageIndexInDay > 0;
    const dayExercises = pageDef.exercises;

    // Grid view cards for each exercise
    const gridCardsHtml = dayExercises.map((item, idx) => {
      const catStyle = getCategoryBadgeStyle(item.category);
      const imgUrl = resolveImageUrl(item.image_uri);
      const exerciseDisplayNumber = pageDef.startIndexInDay + idx + 1;

      // Fallback: use public/categories/<cat>.svg when no exercise image
      const catKey = (item.category || '').toLowerCase().replace(/\s+/g, '_');
      const fallbackImgUrl = (typeof window !== 'undefined')
        ? window.location.origin + '/categories/' + catKey + '.svg'
        : '/categories/' + catKey + '.svg';

      const imageHtml = imgUrl
        ? `<div class="card-image-wrapper">
             <img
               class="card-exercise-img"
               src="${imgUrl}"
               alt="${item.exercise_name}"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
             />
             <div class="card-img-fallback" style="display:none;">
               <img class="card-fallback-svg" src="${fallbackImgUrl}" alt="${item.category}" />
             </div>
             <span class="card-num-overlay">${exerciseDisplayNumber}</span>
             <span class="card-cat-overlay" style="background: ${catStyle.bg}; color: ${catStyle.text}; border: 1px solid ${catStyle.border};">${item.category}</span>
           </div>`
        : `<div class="card-image-wrapper">
             <div class="card-img-fallback">
               <img class="card-fallback-svg" src="${fallbackImgUrl}" alt="${item.category}" />
             </div>
             <span class="card-num-overlay">${exerciseDisplayNumber}</span>
             <span class="card-cat-overlay" style="background: ${catStyle.bg}; color: ${catStyle.text}; border: 1px solid ${catStyle.border};">${item.category}</span>
           </div>`;

      return `
        <div class="exercise-card">
          ${imageHtml}
          <div class="card-info-wrap">
            <div class="card-header">
              <div class="card-name-col">
                <div class="card-exercise-name">${item.exercise_name}</div>
              </div>
            </div>

            <div class="card-stats-grid">
              <div class="stat-cell">
                <div class="stat-label">SETS</div>
                <div class="stat-val">${item.sets}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-label">REPS</div>
                <div class="stat-val">${item.reps}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-label">REST</div>
                <div class="stat-val">${item.rest_time}s</div>
              </div>
            </div>

            ${item.notes
            ? `<div class="card-notes-row">
                    <span class="card-notes-tag">Note:</span> ${item.notes}
                   </div>`
            : ''
          }
          </div>
        </div>
      `;
    }).join('');

    const dayBadgeText = isContinuation
      ? `${pageDef.dayKey.toUpperCase()} (PART ${pageDef.pageIndexInDay + 1})`
      : pageDef.dayKey.toUpperCase();

    const dayCounterText = pageDef.isMultiDay
      ? `Day ${pageDef.dayIndex + 1} of ${pageDef.totalDays}${pageDef.totalPagesInDay > 1 ? ` &bull; Part ${pageDef.pageIndexInDay + 1}/${pageDef.totalPagesInDay}` : ''}`
      : (totalPages > 1 ? `Page ${globalPageNum} of ${totalPages}` : 'Full Routine');

    const footerRightText = pageDef.isMultiDay
      ? `${pageDef.dayKey}${pageDef.totalPagesInDay > 1 ? ` (Part ${pageDef.pageIndexInDay + 1}/${pageDef.totalPagesInDay})` : ''} &nbsp;&bull;&nbsp; Page ${globalPageNum} of ${totalPages}`
      : `Page ${globalPageNum} of ${totalPages}`;

    const totalDayCount = (dayGroups.get(pageDef.dayKey) || []).length;
    const isFirstPage = pageIndex === 0;
    const showTopSection = isFirstPage;
    const showDayBanner = isFirstPage || pageDef.isMultiDay;

    const topSectionHtml = showTopSection
      ? `
          <!-- ════ TOP HEADER (App Logo & Location on Left, Member Name on Right) ════ -->
          <div class="top-header">
            <div class="header-left">
              <div class="app-brand-row">
                <div>
                  <div class="app-brand-title">GRIPSTATE</div>
                  <div class="app-brand-subtitle">GripState Gym Management System</div>
                </div>
              </div>

              <div class="location-row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0A3622" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span class="location-name">${gymName}</span>
              </div>
            </div>

            <div class="header-right">
              <div class="member-badge-label">${(member as any)?.id ? 'ASSIGNED MEMBER' : 'RECIPIENT'}</div>
              <div class="member-full-name">${member?.name || 'Walk-in / Temporary Client'}</div>
              <div class="member-sub-info">
                ${member?.phone ? `<span>📞 ${member.phone}</span>` : ''}
                ${member?.fitness_goals ? `<span>🎯 ${member.fitness_goals}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- ════ ROUTINE PLAN INFORMATION ════ -->
          <div class="routine-plan-banner">
            <div class="routine-plan-info">
              <div class="routine-plan-tag">WORKOUT ROUTINE PLAN</div>
              <div class="routine-plan-title">${plan.title}</div>
              <div class="routine-plan-period">
                <span>Total Exercises: <strong>${exercises.length}</strong></span>
                ${isMultiDay ? `<span class="dot-sep">•</span><span>Multi-Day Split: <strong>${totalDays} Days</strong></span>` : ''}
              </div>
            </div>
            ${plan.notes
            ? `<div class="routine-trainer-notes">
                    <strong>Trainer Note:</strong> ${plan.notes}
                   </div>`
            : ''
          }
          </div>
        `
      : '';

    const dayBannerHtml = showDayBanner
      ? `
          <!-- ════ DAY BANNER ════ -->
          <div class="day-section-banner">
            <div class="day-banner-left">
              <span class="day-tag-badge">${dayBadgeText}</span>
              <span class="day-counter-text">${dayCounterText}</span>
            </div>
            <div class="day-banner-right">
              ${totalDayCount} ${totalDayCount === 1 ? 'Exercise' : 'Exercises'} Scheduled
            </div>
          </div>
        `
      : '';

    return `
      <div class="day-page ${isLastPage ? 'last-day-page' : ''}">
        <div class="day-page-content">
          ${topSectionHtml}
          ${dayBannerHtml}

          <!-- ════ CLEAR EXERCISE GRID VIEW ════ -->
          <div class="exercise-grid ${isFirstPage ? 'grid-2-rows' : 'grid-3-rows'}">
            ${dayExercises.length > 0
              ? gridCardsHtml
              : `<div class="empty-day-grid-box">No exercises assigned for ${pageDef.dayKey}</div>`
            }
          </div>
        </div>

        <!-- ════ FOOTER (Sitting naturally at page bottom via flex margin-top: auto) ════ -->
        <div class="document-footer">
          <div class="footer-left">GripState Management &mdash; Train Smart, Live Stronger</div>
          <div class="footer-right">${footerRightText}</div>
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title></title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            width: 210mm !important;
          }
          .day-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .day-page.last-day-page {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #0F172A;
          background-color: #FFFFFF;
        }
        .day-page {
          width: 210mm;
          min-height: 297mm;
          height: 297mm;
          max-height: 297mm;
          box-sizing: border-box;
          padding: 10mm 12mm 8mm 12mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          overflow: hidden;
          background: #FFFFFF;
        }
        .day-page.last-day-page {
          page-break-after: auto;
          break-after: auto;
        }
        .day-page-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        /* ── TOP HEADER ── */
        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2.5px solid #0A3622;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }
        .header-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .app-brand-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .app-brand-title {
          font-size: 19px;
          font-weight: 900;
          color: #0A3622;
          letter-spacing: 0.8px;
          line-height: 1.1;
        }
        .app-brand-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
          letter-spacing: 0.3px;
        }
        .location-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #E6F4EA;
          border: 1px solid #A7D7B5;
          padding: 3px 10px;
          border-radius: 6px;
          width: fit-content;
        }
        .location-name {
          font-size: 11.5px;
          font-weight: 800;
          color: #0A3622;
          letter-spacing: 0.3px;
        }
        .header-right {
          text-align: right;
          padding: 4px 0;
          min-width: 200px;
        }
        .member-badge-label {
          font-size: 9.5px;
          font-weight: 800;
          color: #64748B;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .member-full-name {
          font-size: 17px;
          font-weight: 900;
          color: #0F172A;
          letter-spacing: -0.2px;
          line-height: 1.2;
        }
        .member-sub-info {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          font-size: 10.5px;
          color: #64748B;
          font-weight: 600;
          margin-top: 3px;
        }

        /* ── ROUTINE PLAN BANNER ── */
        .routine-plan-banner {
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          border-radius: 9px;
          padding: 10px 14px;
          margin-bottom: 12px;
        }
        .routine-plan-tag {
          font-size: 9.5px;
          font-weight: 800;
          color: #10B981;
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }
        .routine-plan-title {
          font-size: 16px;
          font-weight: 800;
          color: #0A3622;
          margin: 2px 0;
        }
        .routine-plan-period {
          font-size: 11.5px;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dot-sep {
          color: #94A3B8;
        }
        .routine-trainer-notes {
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px dashed #CBD5E1;
          font-size: 11.5px;
          color: #334155;
          line-height: 1.35;
        }

        /* ── DAY BANNER ── */
        .day-section-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0A3622;
          color: #FFFFFF;
          padding: 8px 14px;
          border-radius: 8px;
          margin-bottom: 14px;
        }
        .day-banner-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .day-tag-badge {
          background: #10B981;
          color: #FFFFFF;
          font-weight: 900;
          font-size: 12px;
          padding: 3px 9px;
          border-radius: 5px;
          letter-spacing: 0.5px;
        }
        .day-counter-text {
          font-size: 12px;
          font-weight: 600;
          opacity: 0.95;
        }
        .day-banner-right {
          font-size: 11.5px;
          font-weight: 700;
          opacity: 0.9;
        }

        /* ── CLEAR EXERCISE GRID VIEW ── */
        .exercise-grid {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 8px;
        }
        .grid-2-rows {
          grid-template-rows: repeat(2, 1fr);
        }
        .grid-3-rows {
          grid-template-rows: repeat(3, 1fr);
        }
        .exercise-card {
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          background: #FFFFFF;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          page-break-inside: avoid;
          break-inside: avoid;
          overflow: hidden;
          height: 100%;
          min-height: 0;
          box-sizing: border-box;
        }
        /* ── EXERCISE IMAGE ── */
        .card-image-wrapper {
          position: relative;
          width: 100%;
          flex: 1 1 auto;
          min-height: 70px;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 5px;
          background: #F8FAFC;
        }
        .card-exercise-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .card-img-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-info-wrap {
          flex-shrink: 0;
          margin-top: auto;
        }
        .card-fallback-svg {
          width: 65px;
          height: 65px;
          object-fit: contain;
        }
        .card-num-overlay {
          position: absolute;
          top: 6px;
          left: 6px;
          background: #0A3622;
          color: #FFFFFF;
          font-weight: 900;
          font-size: 10.5px;
          width: 22px;
          height: 22px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .card-cat-overlay {
          position: absolute;
          top: 6px;
          right: 6px;
          padding: 2px 6px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          line-height: 1.5;
          pointer-events: none;
        }
        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 5px;
          padding-bottom: 4px;
          border-bottom: 1px solid #F1F5F9;
        }
        .card-number-badge {
          background: #0A3622;
          color: #FFFFFF;
          font-weight: 800;
          font-size: 11px;
          width: 22px;
          height: 22px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .card-name-col {
          flex: 1;
        }
        .card-exercise-name {
          font-weight: 800;
          font-size: 12.5px;
          color: #0F172A;
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .card-category-pill {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .card-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 5px;
          padding: 4px 2px;
        }
        .stat-cell {
          text-align: center;
        }
        .stat-label {
          font-size: 7.5px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 1px;
        }
        .stat-val {
          font-size: 11px;
          font-weight: 800;
          color: #0F172A;
        }
        .card-notes-row {
          margin-top: 4px;
          padding-top: 3px;
          border-top: 1px dashed #E2E8F0;
          font-size: 9.5px;
          color: #475569;
        }
        .card-notes-tag {
          font-weight: 800;
          color: #0A3622;
        }
        .empty-day-grid-box {
          grid-column: span 3;
          padding: 24px;
          text-align: center;
          color: #94A3B8;
          font-size: 12.5px;
          font-style: italic;
          border: 1px dashed #CBD5E1;
          border-radius: 8px;
        }

        /* ── FOOTER (Sitting naturally at page bottom via flex margin-top: auto) ── */
        .document-footer {
          margin-top: auto;
          border-top: 1px solid #E2E8F0;
          padding-top: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9.5px;
          color: #94A3B8;
          background: #FFFFFF;
          flex-shrink: 0;
        }
        .footer-left {
          font-weight: 600;
        }
        .footer-right {
          font-weight: 800;
          color: #64748B;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;

  // ════ PRINT / SHARE LOGIC ════
  // On Web: Render into an isolated hidden iframe so the main application screen is NEVER printed or shown!
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const existingFrame = document.getElementById('workout-pdf-print-frame');
    if (existingFrame && existingFrame.parentNode) {
      existingFrame.parentNode.removeChild(existingFrame);
    }

    const printIframe = document.createElement('iframe');
    printIframe.setAttribute('id', 'workout-pdf-print-frame');
    printIframe.style.position = 'fixed';
    printIframe.style.top = '-9999px';
    printIframe.style.left = '-9999px';
    printIframe.style.width = '1000px';
    printIframe.style.height = '1000px';
    printIframe.style.border = 'none';
    printIframe.style.zIndex = '-9999';
    document.body.appendChild(printIframe);

    const frameDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (err) {
          console.error('Error printing workout PDF in iframe:', err);
        } finally {
          setTimeout(() => {
            if (printIframe.parentNode) {
              printIframe.parentNode.removeChild(printIframe);
            }
          }, 2000);
        }
      }, 350);
    }
    return;
  }

  // On Native Mobile (iOS & Android): Generate PDF file and trigger native sharing sheet
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Share ${plan.title} - ${member?.name || 'Workout Plan'}`,
    });
  }
}

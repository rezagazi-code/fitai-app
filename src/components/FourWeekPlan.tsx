/**
 * اپ هوشمند بدنسازی — the program's 4-week block, visible on demand.
 *
 * Honest shape, from lib/schedule: a program is ONE weekly template
 * repeated across a 4-week block — weeks 1–3 overload, week 4 deload
 * (same exercises, sets cut ~45% via deloadSets). Nothing here invents
 * different week contents: every week shows the same days, and week 4
 * shows the deload set counts the session board itself applies.
 */
import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { EQUIPMENT_LABELS, getExercise } from '../lib/exercises';
import { getAthleteProfile } from '../lib/store';
import type { WorkoutProgram } from '../lib/store';
import { deloadSets, EN_WEEKDAYS, FA_WEEKDAYS, trainingWeekdays } from '../lib/schedule';

interface FourWeekPlanProps {
  program: WorkoutProgram;
}

export default function FourWeekPlan({ program }: FourWeekPlanProps): ReactElement {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [openWeek, setOpenWeek] = useState<number | null>(1);
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const weekdays = lang === 'fa' ? FA_WEEKDAYS : EN_WEEKDAYS;
  // Fallback rows: a program built with sparse equipment can contain an
  // exercise the current equipment does not cover (relaxed pool). Flag
  // it with the same «needs equipment» wording the session board uses,
  // so the 4-week view never silently shows a machine move to someone
  // who removed machines.
  const owned = getAthleteProfile()?.equipment ?? [];
  const missingNote = (ex: NonNullable<ReturnType<typeof getExercise>>): string | null => {
    if (owned.length === 0) return null;
    const missing = ex.equipment.filter((t) => !owned.includes(t));
    if (missing.length === 0) return null;
    const names = missing.map((t) => (lang === 'fa' ? EQUIPMENT_LABELS[t].fa : EQUIPMENT_LABELS[t].en)).join(lang === 'fa' ? '، ' : ', ');
    return lang === 'fa' ? `نیاز به وسیله: ${names}` : `Requires equipment: ${names}`;
  };
  const trainWeekdays = trainingWeekdays(program.daysPerWeek);

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        className="btn-ghost"
        style={{ width: '100%' }}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t('workouts.fourWeekHide') : t('workouts.fourWeekShow')}
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <p className="card-meta" style={{ margin: 0 }}>
            {t('workouts.fourWeekTitle')} — {t('sched.week')} {fmt(1)}–{fmt(3)} {t('workouts.weekOverload')}،{' '}
            {t('sched.week')} {fmt(4)} {t('sched.deload')}
          </p>
          {[1, 2, 3, 4].map((week) => {
            const isDeload = week === 4;
            const expanded = openWeek === week;
            return (
              <div key={week} className="card" style={{ padding: 12 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  aria-expanded={expanded}
                  onClick={() => setOpenWeek(expanded ? null : week)}
                >
                  <span>
                    {t('sched.week')} {fmt(week)} · {isDeload ? t('sched.deload') : t('workouts.weekOverload')}
                  </span>
                  <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
                </button>
                {expanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    {isDeload && <p className="card-meta" style={{ margin: 0 }}>{t('sched.deloadNote')}</p>}
                    {program.days.map((day, dayIdx) => {
                      const weekday = trainWeekdays[dayIdx];
                      const dayName = program.dayNames?.[dayIdx];
                      return (
                        <div key={dayIdx}>
                          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
                            {weekday != null ? weekdays[weekday] : ''}
                            {dayName ? ` · ${lang === 'fa' ? dayName.fa : dayName.en}` : ''}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {day.map((pe) => {
                              const ex = getExercise(pe.exerciseKey);
                              const sets = isDeload ? deloadSets(pe.sets) : pe.sets;
                              const note = ex ? missingNote(ex) : null;
                              return (
                                <div key={pe.exerciseKey}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span>{ex ? (lang === 'fa' ? ex.nameFa : ex.nameEn) : pe.exerciseKey}</span>
                                    <span className="chip" style={{ whiteSpace: 'nowrap' }}>
                                      {fmt(sets)} {t('w.sets')} · {pe.reps} {t('w.reps')}
                                    </span>
                                  </div>
                                  {note && (
                                    <p className="card-meta" style={{ margin: '2px 0 0' }}>
                                      {note}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

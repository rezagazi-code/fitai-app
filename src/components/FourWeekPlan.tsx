/**
 * اپ هوشمند بدنسازی — the program's 4-week block, visible on demand.
 *
 * Honest shape, from lib/schedule: a program is ONE weekly template
 * repeated across a 4-week block — weeks 1–3 overload, week 4 deload
 * (same exercises, sets cut ~45% via deloadSets). Nothing here invents
 * different week contents: every week shows the same days, and week 4
 * shows the deload set counts the session board itself applies.
 *
 * Every exercise row shows fa + en names (from the stored exercise
 * data, never translated here) and expands EXACTLY ONE slide-down
 * panel beneath it with the movement demo, the correct form and
 * explanation from the exercise's own stored instructions, and a
 * video button only where a verified MuscleWiki URL already exists.
 * No «needs equipment» text is rendered anywhere: the engine only
 * ever emits exercises the user has equipment for (see program.ts),
 * so a row here is always doable with the stated equipment.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { getExercise } from '../lib/exercises';
import type { WorkoutProgram } from '../lib/store';
import { deloadSets, EN_WEEKDAYS, FA_WEEKDAYS, trainingWeekdays } from '../lib/schedule';
import ExerciseSlidePanel from './ExerciseSlidePanel';

interface FourWeekPlanProps {
  program: WorkoutProgram;
  /** Week to open on mount (Home week chip deep-link). Defaults to 1. */
  initialWeek?: number | null;
  /** Open the block expanded on mount (Home week chip deep-link). */
  autoOpen?: boolean;
}

export default function FourWeekPlan({ program, initialWeek, autoOpen }: FourWeekPlanProps): ReactElement {
  const { t, lang } = useLang();
  const fa = lang === 'fa';
  const [open, setOpen] = useState(autoOpen ?? false);
  const [openWeek, setOpenWeek] = useState<number | null>(initialWeek ?? 1);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // A Home week-chip tap lands here with the block already open on
  // that week; scroll it into view so the user sees the week they
  // asked for, not the top of the program card.
  useEffect(() => {
    if (autoOpen) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Run once on mount for the deep-link only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const trainWeekdays = trainingWeekdays(program.daysPerWeek);

  return (
    <div style={{ marginTop: 8 }} data-fourweek ref={rootRef}>
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
              <div key={week} className="card" style={{ padding: 12 }} data-fourweek-week={week}>
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
                      // Day title in both languages, from stored data
                      // only: weekday + split name (split name only
                      // when the program carries dayNames).
                      const titleFa = `${weekday != null ? FA_WEEKDAYS[weekday] : ''}${dayName ? ` · ${dayName.fa}` : ''}`;
                      const titleEn = `${weekday != null ? EN_WEEKDAYS[weekday] : ''}${dayName ? ` · ${dayName.en}` : ''}`;
                      return (
                        <div key={dayIdx}>
                          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
                            {fa ? titleFa : titleEn}
                          </p>
                          <p className="card-meta" style={{ margin: '0 0 6px' }} dir={fa ? 'ltr' : 'rtl'}>
                            {fa ? titleEn : titleFa}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {day.map((pe) => {
                              const ex = getExercise(pe.exerciseKey);
                              const sets = isDeload ? deloadSets(pe.sets) : pe.sets;
                              const rowId = `${dayIdx}-${pe.exerciseKey}`;
                              const rowOpen = openRow === rowId;
                              return (
                                <div key={pe.exerciseKey} data-fourweek-exercise={rowId}>
                                  <button
                                    type="button"
                                    className="btn-ghost"
                                    style={{
                                      width: '100%',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'flex-start',
                                      gap: 8,
                                      padding: 0,
                                      textAlign: 'start',
                                    }}
                                    aria-expanded={rowOpen}
                                    onClick={() => setOpenRow(rowOpen ? null : rowId)}
                                  >
                                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span>{ex ? (fa ? ex.nameFa : ex.nameEn) : pe.exerciseKey}</span>
                                      {ex && (
                                        <span className="card-meta" dir={fa ? 'ltr' : 'rtl'} style={{ margin: 0 }}>
                                          {fa ? ex.nameEn : ex.nameFa}
                                        </span>
                                      )}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                      <span className="chip" style={{ whiteSpace: 'nowrap' }}>
                                        {fmt(sets)} {t('w.sets')} · {pe.reps} {t('w.reps')}
                                      </span>
                                      <span aria-hidden="true">{rowOpen ? '⌃' : '⌄'}</span>
                                    </span>
                                  </button>
                                  {ex && <ExerciseSlidePanel exercise={ex} open={rowOpen} />}
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

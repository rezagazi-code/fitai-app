/**
 * Musclepro — gym profile selector (second-priority dossier item).
 *
 * The selected profile becomes the equipment the NEXT program build
 * starts from (the onboarding wizard reads it first). Changing it
 * never rebuilds or touches the current program — the user always
 * knows which "gym" a future plan will assume.
 */

import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import {
  addGymProfile,
  getGymProfiles,
  getSelectedGymProfile,
  setSelectedGymProfile,
} from '../lib/gymProfiles';
import { EQUIPMENT_TYPES } from '../lib/exercises';

const KEYS = {
  fa: {
    title: 'پروفایل باشگاه',
    subtitle: 'باشگاهی که برنامه‌ی بعدی با وسیله‌های آن ساخته می‌شود. تغییر آن، برنامه‌ی فعلی را دست نمی‌زند.',
    selected: 'انتخاب‌شده',
    addTitle: 'پروفایل تازه',
    name: 'نام باشگاه',
    add: 'افزودن پروفایل',
    equipment: 'وسیله‌ها',
  },
  en: {
    title: 'Gym profile',
    subtitle: 'The gym the NEXT program build starts from. Changing it never touches the current program.',
    selected: 'Selected',
    addTitle: 'New profile',
    name: 'Gym name',
    add: 'Add profile',
    equipment: 'Equipment',
  },
} as const;

export default function GymProfilePanel(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const [profiles, setProfiles] = useState(() => getGymProfiles());
  const [selected, setSelected] = useState(() => getSelectedGymProfile());
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<string[]>(['bodyweight', 'dumbbell']);

  const toggleEquip = (eq: string) => {
    setEquipment((cur) => (cur.includes(eq) ? cur.filter((e) => e !== eq) : [...cur, eq]));
  };

  return (
    <section className="card" data-gym-profiles>
      <h3 className="card-title">{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{L.subtitle}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip${selected.id === p.id ? ' chip--active' : ''}`}
            aria-pressed={selected.id === p.id}
            onClick={() => {
              setSelectedGymProfile(p.id);
              setSelected(p);
            }}
          >
            {lang === 'fa' ? p.nameFa : p.nameEn}
            {selected.id === p.id ? ` · ${L.selected}` : ''}
          </button>
        ))}
      </div>
      <h4 className="card-title" style={{ fontSize: 'var(--text-base)' }}>{L.addTitle}</h4>
      <input
        className="input"
        style={{ width: '100%', marginBottom: 8 }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={L.name}
      />
      <p className="card-meta" style={{ margin: '0 0 8px' }}>{L.equipment}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {EQUIPMENT_TYPES.map((eq) => (
          <button
            key={eq}
            type="button"
            className={`chip${equipment.includes(eq) ? ' chip--active' : ''}`}
            aria-pressed={equipment.includes(eq)}
            onClick={() => toggleEquip(eq)}
          >
            {eq}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={!name.trim() || equipment.length === 0}
        onClick={() => {
          const created = addGymProfile(name, name, equipment);
          setProfiles(getGymProfiles());
          setSelected(created);
          setName('');
        }}
      >
        {L.add}
      </button>
    </section>
  );
}

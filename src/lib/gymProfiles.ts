/**
 * Musclepro — multi-gym profiles (second-priority dossier item).
 *
 * A gym profile is just a named equipment set: home, full gym, travel.
 * Selecting one does not silently rebuild anything — it becomes the
 * equipment the NEXT program build starts from (the onboarding wizard
 * reads the selected profile first), and it is shown on the profile
 * screen so the user always knows which "gym" their plan assumes.
 * Everything is localStorage only.
 */

export interface GymProfile {
  id: string;
  nameFa: string;
  nameEn: string;
  equipment: string[]; // equipment keys as used by onboarding/program
}

export const DEFAULT_GYM_PROFILES: GymProfile[] = [
  { id: 'home', nameFa: 'خانه', nameEn: 'Home', equipment: ['bodyweight', 'dumbbell'] },
  { id: 'full-gym', nameFa: 'باشگاه کامل', nameEn: 'Full gym', equipment: ['bodyweight', 'dumbbell', 'barbell', 'cable', 'machine', 'bench', 'kettlebell', 'band'] },
  { id: 'travel', nameFa: 'سفر / هتل', nameEn: 'Travel', equipment: ['bodyweight', 'band'] },
];

const PROFILES_KEY = 'fitai.gymProfiles';
const SELECTED_KEY = 'fitai.selectedGymProfile';

function readStored(): GymProfile[] | null {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as GymProfile[]) : null;
  } catch {
    return null;
  }
}

export function getGymProfiles(): GymProfile[] {
  return readStored() ?? DEFAULT_GYM_PROFILES;
}

export function getSelectedGymProfile(): GymProfile {
  const profiles = getGymProfiles();
  try {
    const id = localStorage.getItem(SELECTED_KEY);
    return profiles.find((p) => p.id === id) ?? profiles[0];
  } catch {
    return profiles[0];
  }
}

export function setSelectedGymProfile(id: string): void {
  try {
    localStorage.setItem(SELECTED_KEY, id);
  } catch {
    /* ignore */
  }
}

export function addGymProfile(nameFa: string, nameEn: string, equipment: string[]): GymProfile {
  const profile: GymProfile = {
    id: `gym-${Date.now()}`,
    nameFa: nameFa.trim(),
    nameEn: nameEn.trim() || nameFa.trim(),
    equipment,
  };
  const all = getGymProfiles();
  all.push(profile);
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
    localStorage.setItem(SELECTED_KEY, profile.id);
  } catch {
    /* ignore */
  }
  return profile;
}

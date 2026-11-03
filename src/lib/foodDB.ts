/**
 * Musclepro — complete food database (Iranian + general).
 *
 * Sourcing, honestly stated (see /tmp/musclepro-data/README.txt from the
 * curation pass): general staples use public general nutritional knowledge
 * in the spirit of USDA FoodData Central (CC0) AS A CONCEPT ONLY — no USDA
 * file was downloaded, copied, or merged here; values are rounded general
 * per-unit values. Iranian entries are ORIGINAL curations written for this
 * app, all marked estimate=true with a rangeKcal interval where the value
 * varies by recipe/portion/cooking fat. Open Food Facts is NOT merged in
 * (ODbL kept separate); no competitor database, artwork, brand, or text
 * was copied. proteinG/carbsG/fatG may be null — null means unknown, never
 * a fake precise value.
 *
 * ALL calories are GENERAL ESTIMATES, never a personal diagnosis or a
 * personal calorie prescription. The UI must show estimate entries as
 * approximate ("حدودی") and show the range where present.
 *
 * Structure for later server delivery: this module is a plain typed array
 * with stable keys, so it can be swapped for a server-fetched table with
 * the same shape without touching callers. No server is provisioned yet;
 * the app stays local-first until server details are given.
 */

export type FoodDBSource = 'iranian-original' | 'usda-staple' | 'general-estimate';

export interface FoodDBEntry {
  key: string;
  nameFa: string;
  nameEn: string;
  unitFa: string;
  unitEn: string;
  gramsPerUnit: number;
  kcalPerUnit: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  source: FoodDBSource;
  /** true = general estimate (show as approximate, show range when present). */
  estimate: boolean;
  rangeKcal: [number, number] | null;
  /** Spoken Persian aliases for voice parsing (may be empty). */
  aliasesFa: string[];
}

/** Alias kept for components written against the draft name. */
export type FoodDBItem = FoodDBEntry;

export const FOOD_DB: FoodDBEntry[] = [
  { key: 'nan-sangak', nameFa: 'نان سنگک', nameEn: 'Sangak bread', unitFa: 'نان', unitEn: 'piece', gramsPerUnit: 80, kcalPerUnit: 210, proteinG: 6, carbsG: 42, fatG: 3, source: 'iranian-original', estimate: true, rangeKcal: [180, 240], aliasesFa: ['نان سنگک', 'سنگک'] },
  { key: 'nan-barbari', nameFa: 'نان بربری', nameEn: 'Barbari bread', unitFa: 'نان', unitEn: 'piece', gramsPerUnit: 100, kcalPerUnit: 270, proteinG: 8, carbsG: 52, fatG: 4, source: 'iranian-original', estimate: true, rangeKcal: [230, 310], aliasesFa: ['نان بربری', 'بربری'] },
  { key: 'nan-taftoon', nameFa: 'نان تافتون', nameEn: 'Taftoon bread', unitFa: 'نان', unitEn: 'piece', gramsPerUnit: 60, kcalPerUnit: 170, proteinG: 5, carbsG: 33, fatG: 2, source: 'iranian-original', estimate: true, rangeKcal: [150, 195], aliasesFa: ['نان تافتون', 'تافتون'] },
  { key: 'nan-lavash', nameFa: 'نان لواش', nameEn: 'Lavash bread', unitFa: 'نان', unitEn: 'piece', gramsPerUnit: 40, kcalPerUnit: 115, proteinG: 3, carbsG: 22, fatG: 1, source: 'iranian-original', estimate: true, rangeKcal: [100, 135], aliasesFa: ['نان لواش', 'لواش'] },
  { key: 'nan-sangak-lokme', nameFa: 'لقمه نان سنگک', nameEn: 'Sangak piece (small)', unitFa: 'لقمه', unitEn: 'piece', gramsPerUnit: 30, kcalPerUnit: 80, proteinG: 2, carbsG: 16, fatG: 1, source: 'iranian-original', estimate: true, rangeKcal: [70, 95], aliasesFa: [] },
  { key: 'chelo-sade', nameFa: 'چلو ساده', nameEn: 'Plain steamed rice', unitFa: 'پیمانه پخته', unitEn: 'cup cooked', gramsPerUnit: 150, kcalPerUnit: 195, proteinG: 4, carbsG: 43, fatG: 1, source: 'iranian-original', estimate: true, rangeKcal: [170, 220], aliasesFa: ['چلو', 'برنج'] },
  { key: 'kateh', nameFa: 'کته', nameEn: 'Kateh rice', unitFa: 'پیمانه پخته', unitEn: 'cup cooked', gramsPerUnit: 150, kcalPerUnit: 205, proteinG: 4, carbsG: 44, fatG: 2, source: 'iranian-original', estimate: true, rangeKcal: [180, 230], aliasesFa: ['کته'] },
  { key: 'baghali-polo', nameFa: 'باقالی پلو', nameEn: 'Baghali polo', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 180, kcalPerUnit: 320, proteinG: 9, carbsG: 52, fatG: 8, source: 'iranian-original', estimate: true, rangeKcal: [280, 370], aliasesFa: ['باقالی پلو'] },
  { key: 'sabzi-polo', nameFa: 'سبزی پلو', nameEn: 'Sabzi polo', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 170, kcalPerUnit: 290, proteinG: 6, carbsG: 50, fatG: 6, source: 'iranian-original', estimate: true, rangeKcal: [250, 330], aliasesFa: ['سبزی پلو'] },
  { key: 'zereshk-polo', nameFa: 'زرشک پلو', nameEn: 'Zereshk polo', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 170, kcalPerUnit: 300, proteinG: 6, carbsG: 55, fatG: 5, source: 'iranian-original', estimate: true, rangeKcal: [260, 340], aliasesFa: ['زرشک پلو'] },
  { key: 'tahdig', nameFa: 'ته‌دیگ', nameEn: 'Tahdig', unitFa: 'تکه', unitEn: 'piece', gramsPerUnit: 40, kcalPerUnit: 150, proteinG: 2, carbsG: 20, fatG: 6, source: 'iranian-original', estimate: true, rangeKcal: [120, 180], aliasesFa: ['ته دیگ'] },
  { key: 'berenj-kham', nameFa: 'برنج خام (خشک)', nameEn: 'White rice dry', unitFa: 'پیمانه خشک', unitEn: 'cup dry', gramsPerUnit: 185, kcalPerUnit: 675, proteinG: 13, carbsG: 148, fatG: 1, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'ghormeh-sabzi', nameFa: 'قورمه سبزی', nameEn: 'Ghormeh sabzi', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 300, kcalPerUnit: 380, proteinG: 22, carbsG: 18, fatG: 26, source: 'iranian-original', estimate: true, rangeKcal: [300, 470], aliasesFa: ['قورمه سبزی', 'قورمه'] },
  { key: 'fesenjan', nameFa: 'فسنجان', nameEn: 'Fesenjan', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 280, kcalPerUnit: 450, proteinG: 24, carbsG: 22, fatG: 32, source: 'iranian-original', estimate: true, rangeKcal: [380, 550], aliasesFa: ['فسنجان'] },
  { key: 'gheimeh', nameFa: 'قیمه', nameEn: 'Gheimeh', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 280, kcalPerUnit: 340, proteinG: 22, carbsG: 30, fatG: 16, source: 'iranian-original', estimate: true, rangeKcal: [280, 410], aliasesFa: ['قیمه'] },
  { key: 'gheimeh-bademjan', nameFa: 'قیمه بادمجان', nameEn: 'Gheimeh bademjan', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 300, kcalPerUnit: 360, proteinG: 20, carbsG: 28, fatG: 19, source: 'iranian-original', estimate: true, rangeKcal: [300, 430], aliasesFa: [] },
  { key: 'khoresh-bademjan', nameFa: 'خورشت بادمجان', nameEn: 'Khoresh bademjan', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 300, kcalPerUnit: 330, proteinG: 18, carbsG: 20, fatG: 19, source: 'iranian-original', estimate: true, rangeKcal: [270, 400], aliasesFa: ['خورشت بادمجان'] },
  { key: 'khoresh-karafs', nameFa: 'خورشت کرفس', nameEn: 'Khoresh karafs', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 280, kcalPerUnit: 260, proteinG: 20, carbsG: 14, fatG: 14, source: 'iranian-original', estimate: true, rangeKcal: [210, 320], aliasesFa: ['خورشت کرفس'] },
  { key: 'khoresh-alu-esfenaj', nameFa: 'خورشت آلو اسفناج', nameEn: 'Khoresh alu esfenaj', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 280, kcalPerUnit: 290, proteinG: 20, carbsG: 20, fatG: 15, source: 'iranian-original', estimate: true, rangeKcal: [240, 350], aliasesFa: [] },
  { key: 'abgoosht', nameFa: 'آبگوشت', nameEn: 'Abgoosht', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 350, kcalPerUnit: 480, proteinG: 30, carbsG: 28, fatG: 27, source: 'iranian-original', estimate: true, rangeKcal: [400, 580], aliasesFa: ['آبگوشت'] },
  { key: 'dizi', nameFa: 'دیزی', nameEn: 'Dizi', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 350, kcalPerUnit: 470, proteinG: 29, carbsG: 27, fatG: 26, source: 'iranian-original', estimate: true, rangeKcal: [400, 560], aliasesFa: ['دیزی'] },
  { key: 'khoresh-gheymeh-nesar', nameFa: 'قیمه نثار', nameEn: 'Gheymeh nesar', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 280, kcalPerUnit: 400, proteinG: 22, carbsG: 38, fatG: 17, source: 'iranian-original', estimate: true, rangeKcal: [340, 470], aliasesFa: [] },
  { key: 'kebab-koobideh', nameFa: 'کباب کوبیده', nameEn: 'Kebab koobideh', unitFa: 'سیخ', unitEn: 'skewer', gramsPerUnit: 90, kcalPerUnit: 260, proteinG: 20, carbsG: 2, fatG: 19, source: 'iranian-original', estimate: true, rangeKcal: [220, 310], aliasesFa: ['کباب کوبیده', 'کوبیده'] },
  { key: 'joojeh-kebab', nameFa: 'جوجه کباب', nameEn: 'Joojeh kebab', unitFa: 'سیخ', unitEn: 'skewer', gramsPerUnit: 110, kcalPerUnit: 210, proteinG: 26, carbsG: 1, fatG: 11, source: 'iranian-original', estimate: true, rangeKcal: [170, 250], aliasesFa: ['جوجه', 'جوجه کباب'] },
  { key: 'kebab-soltani', nameFa: 'کباب سلطانی', nameEn: 'Kebab soltani', unitFa: 'پرس', unitEn: 'serving', gramsPerUnit: 220, kcalPerUnit: 520, proteinG: 38, carbsG: 3, fatG: 39, source: 'iranian-original', estimate: true, rangeKcal: [440, 620], aliasesFa: ['کباب سلطانی'] },
  { key: 'kebab-barg', nameFa: 'کباب برگ', nameEn: 'Kebab barg', unitFa: 'سیخ', unitEn: 'skewer', gramsPerUnit: 120, kcalPerUnit: 300, proteinG: 28, carbsG: 1, fatG: 20, source: 'iranian-original', estimate: true, rangeKcal: [250, 360], aliasesFa: ['کباب برگ'] },
  { key: 'chenjeh', nameFa: 'چنجه', nameEn: 'Chenjeh', unitFa: 'سیخ', unitEn: 'skewer', gramsPerUnit: 110, kcalPerUnit: 270, proteinG: 26, carbsG: 1, fatG: 17, source: 'iranian-original', estimate: true, rangeKcal: [220, 320], aliasesFa: ['چنجه'] },
  { key: 'kebab-mahi', nameFa: 'کباب ماهی', nameEn: 'Grilled fish kebab', unitFa: 'سیخ', unitEn: 'skewer', gramsPerUnit: 110, kcalPerUnit: 180, proteinG: 24, carbsG: 1, fatG: 8, source: 'iranian-original', estimate: true, rangeKcal: [150, 220], aliasesFa: [] },
  { key: 'koobideh-morgh', nameFa: 'کوبیده مرغ', nameEn: 'Chicken koobideh', unitFa: 'سیخ', unitEn: 'skewer', gramsPerUnit: 90, kcalPerUnit: 190, proteinG: 22, carbsG: 2, fatG: 10, source: 'iranian-original', estimate: true, rangeKcal: [160, 230], aliasesFa: [] },
  { key: 'chelo-morgh', nameFa: 'چلو مرغ', nameEn: 'Chelo morgh', unitFa: 'پرس', unitEn: 'serving', gramsPerUnit: 350, kcalPerUnit: 550, proteinG: 35, carbsG: 48, fatG: 19, source: 'iranian-original', estimate: true, rangeKcal: [470, 650], aliasesFa: ['چلو مرغ'] },
  { key: 'chelo-kebab-koobideh', nameFa: 'چلو کباب کوبیده', nameEn: 'Chelo kebab koobideh', unitFa: 'پرس', unitEn: 'serving', gramsPerUnit: 400, kcalPerUnit: 680, proteinG: 32, carbsG: 50, fatG: 36, source: 'iranian-original', estimate: true, rangeKcal: [580, 790], aliasesFa: ['چلو کباب', 'چلو کباب کوبیده'] },
  { key: 'ash-reshteh', nameFa: 'آش رشته', nameEn: 'Ash reshteh', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 300, kcalPerUnit: 320, proteinG: 12, carbsG: 48, fatG: 10, source: 'iranian-original', estimate: true, rangeKcal: [260, 390], aliasesFa: ['آش رشته'] },
  { key: 'ash-jo', nameFa: 'آش جو', nameEn: 'Ash jo', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 280, kcalPerUnit: 240, proteinG: 10, carbsG: 38, fatG: 6, source: 'iranian-original', estimate: true, rangeKcal: [200, 290], aliasesFa: ['آش جو'] },
  { key: 'ash-doogh', nameFa: 'آش دوغ', nameEn: 'Ash doogh', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 280, kcalPerUnit: 220, proteinG: 9, carbsG: 32, fatG: 7, source: 'iranian-original', estimate: true, rangeKcal: [180, 270], aliasesFa: ['آش دوغ'] },
  { key: 'haleem', nameFa: 'حلیم', nameEn: 'Haleem', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 280, kcalPerUnit: 340, proteinG: 22, carbsG: 36, fatG: 12, source: 'iranian-original', estimate: true, rangeKcal: [280, 410], aliasesFa: ['حلیم'] },
  { key: 'kashk-bademjan', nameFa: 'کشک بادمجان', nameEn: 'Kashk bademjan', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 220, kcalPerUnit: 260, proteinG: 8, carbsG: 16, fatG: 18, source: 'iranian-original', estimate: true, rangeKcal: [210, 320], aliasesFa: ['کشک بادمجان'] },
  { key: 'mirza-ghasemi', nameFa: 'میرزا قاسمی', nameEn: 'Mirza ghasemi', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 220, kcalPerUnit: 240, proteinG: 7, carbsG: 12, fatG: 18, source: 'iranian-original', estimate: true, rangeKcal: [190, 300], aliasesFa: ['میرزا قاسمی'] },
  { key: 'kuku-sabzi', nameFa: 'کوکو سبزی', nameEn: 'Kuku sabzi', unitFa: 'تکه', unitEn: 'piece', gramsPerUnit: 80, kcalPerUnit: 170, proteinG: 6, carbsG: 6, fatG: 13, source: 'iranian-original', estimate: true, rangeKcal: [140, 210], aliasesFa: ['کوکو سبزی'] },
  { key: 'kuku-sibzamini', nameFa: 'کوکو سیب‌زمینی', nameEn: 'Kuku sibzamini', unitFa: 'تکه', unitEn: 'piece', gramsPerUnit: 80, kcalPerUnit: 180, proteinG: 4, carbsG: 18, fatG: 10, source: 'iranian-original', estimate: true, rangeKcal: [150, 220], aliasesFa: ['کوکو سیب زمینی'] },
  { key: 'dolmeh', nameFa: 'دلمه', nameEn: 'Dolmeh', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 70, kcalPerUnit: 120, proteinG: 4, carbsG: 16, fatG: 5, source: 'iranian-original', estimate: true, rangeKcal: [95, 150], aliasesFa: ['دلمه'] },
  { key: 'koofteh-tabrizi', nameFa: 'کوفته تبریزی', nameEn: 'Koofteh Tabrizi', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 150, kcalPerUnit: 280, proteinG: 18, carbsG: 22, fatG: 13, source: 'iranian-original', estimate: true, rangeKcal: [230, 340], aliasesFa: ['کوفته'] },
  { key: 'salad-olivieh', nameFa: 'سالاد الویه', nameEn: 'Salad Olivieh', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 200, kcalPerUnit: 320, proteinG: 10, carbsG: 20, fatG: 21, source: 'iranian-original', estimate: true, rangeKcal: [260, 390], aliasesFa: ['سالاد الویه'] },
  { key: 'salad-shirazi', nameFa: 'سالاد شیرازی', nameEn: 'Salad Shirazi', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 150, kcalPerUnit: 45, proteinG: 1, carbsG: 9, fatG: 1, source: 'iranian-original', estimate: true, rangeKcal: [35, 60], aliasesFa: ['سالاد شیرازی'] },
  { key: 'mast-khiar', nameFa: 'ماست و خیار', nameEn: 'Mast-o-khiar', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 150, kcalPerUnit: 80, proteinG: 5, carbsG: 8, fatG: 4, source: 'iranian-original', estimate: true, rangeKcal: [60, 105], aliasesFa: ['ماست و خیار'] },
  { key: 'borani-esfenaj', nameFa: 'بورانی اسفناج', nameEn: 'Borani esfenaj', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 150, kcalPerUnit: 110, proteinG: 6, carbsG: 8, fatG: 7, source: 'iranian-original', estimate: true, rangeKcal: [85, 140], aliasesFa: [] },
  { key: 'mast', nameFa: 'ماست', nameEn: 'Yogurt (plain)', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 150, kcalPerUnit: 90, proteinG: 5, carbsG: 7, fatG: 5, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['ماست'] },
  { key: 'mast-chekideh', nameFa: 'ماست چکیده', nameEn: 'Strained yogurt', unitFa: 'قاشق غذاخوری', unitEn: 'tbsp', gramsPerUnit: 30, kcalPerUnit: 30, proteinG: 2, carbsG: 1, fatG: 2, source: 'iranian-original', estimate: true, rangeKcal: [25, 40], aliasesFa: ['ماست چکیده'] },
  { key: 'doogh', nameFa: 'دوغ', nameEn: 'Doogh', unitFa: 'لیوان', unitEn: 'glass', gramsPerUnit: 240, kcalPerUnit: 70, proteinG: 3, carbsG: 6, fatG: 3, source: 'iranian-original', estimate: true, rangeKcal: [55, 90], aliasesFa: ['دوغ'] },
  { key: 'paneer', nameFa: 'پنیر', nameEn: 'Cheese (white/feta style)', unitFa: 'تکه', unitEn: 'piece', gramsPerUnit: 30, kcalPerUnit: 80, proteinG: 5, carbsG: 1, fatG: 6, source: 'iranian-original', estimate: true, rangeKcal: [65, 100], aliasesFa: ['پنیر'] },
  { key: 'kashk', nameFa: 'کشک', nameEn: 'Kashk', unitFa: 'قاشق غذاخوری', unitEn: 'tbsp', gramsPerUnit: 20, kcalPerUnit: 35, proteinG: 2, carbsG: 2, fatG: 2, source: 'iranian-original', estimate: true, rangeKcal: [28, 45], aliasesFa: ['کشک'] },
  { key: 'khameh', nameFa: 'خامه', nameEn: 'Cream', unitFa: 'قاشق غذاخوری', unitEn: 'tbsp', gramsPerUnit: 15, kcalPerUnit: 50, proteinG: 0, carbsG: 1, fatG: 5, source: 'general-estimate', estimate: true, rangeKcal: [40, 60], aliasesFa: [] },
  { key: 'kareh', nameFa: 'کره', nameEn: 'Butter', unitFa: 'قاشق غذاخوری', unitEn: 'tbsp', gramsPerUnit: 14, kcalPerUnit: 100, proteinG: 0, carbsG: 0, fatG: 11, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['کره'] },
  { key: 'shir', nameFa: 'شیر', nameEn: 'Milk', unitFa: 'لیوان', unitEn: 'glass', gramsPerUnit: 240, kcalPerUnit: 150, proteinG: 8, carbsG: 12, fatG: 8, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['شیر'] },
  { key: 'shir-kamcharb', nameFa: 'شیر کم‌چرب', nameEn: 'Low-fat milk', unitFa: 'لیوان', unitEn: 'glass', gramsPerUnit: 240, kcalPerUnit: 100, proteinG: 8, carbsG: 12, fatG: 2, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'chicken-breast', nameFa: 'سینه مرغ', nameEn: 'Chicken breast', unitFa: 'کف دست', unitEn: 'palm', gramsPerUnit: 120, kcalPerUnit: 195, proteinG: 36, carbsG: 0, fatG: 4, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['سینه مرغ', 'مرغ'] },
  { key: 'chicken-thigh', nameFa: 'ران مرغ', nameEn: 'Chicken thigh', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 110, kcalPerUnit: 230, proteinG: 24, carbsG: 0, fatG: 14, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'egg', nameFa: 'تخم مرغ', nameEn: 'Egg', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 50, kcalPerUnit: 70, proteinG: 6, carbsG: 0, fatG: 5, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['تخم مرغ', 'تخم‌مرغ'] },
  { key: 'egg-white', nameFa: 'سفیده تخم مرغ', nameEn: 'Egg white', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 33, kcalPerUnit: 17, proteinG: 4, carbsG: 0, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'tuna', nameFa: 'تن ماهی', nameEn: 'Tuna (canned in water)', unitFa: 'قوطی', unitEn: 'can', gramsPerUnit: 120, kcalPerUnit: 170, proteinG: 28, carbsG: 0, fatG: 5, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['تن ماهی'] },
  { key: 'salmon', nameFa: 'ماهی سالمون', nameEn: 'Salmon', unitFa: 'کف دست', unitEn: 'fillet', gramsPerUnit: 120, kcalPerUnit: 240, proteinG: 26, carbsG: 0, fatG: 14, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['سالمون', 'ماهی'] },
  { key: 'beef-lean', nameFa: 'گوشت گاو کم‌چرب', nameEn: 'Lean beef', unitFa: 'کف دست', unitEn: 'palm', gramsPerUnit: 120, kcalPerUnit: 210, proteinG: 30, carbsG: 0, fatG: 9, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'lamb', nameFa: 'گوشت گوسفند', nameEn: 'Lamb', unitFa: 'کف دست', unitEn: 'palm', gramsPerUnit: 120, kcalPerUnit: 300, proteinG: 26, carbsG: 0, fatG: 21, source: 'general-estimate', estimate: true, rangeKcal: [260, 350], aliasesFa: [] },
  { key: 'turkey-breast', nameFa: 'سینه بوقلمون', nameEn: 'Turkey breast', unitFa: 'کف دست', unitEn: 'palm', gramsPerUnit: 120, kcalPerUnit: 180, proteinG: 34, carbsG: 0, fatG: 3, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'tofu', nameFa: 'توفو', nameEn: 'Tofu', unitFa: 'تکه', unitEn: 'piece', gramsPerUnit: 100, kcalPerUnit: 80, proteinG: 8, carbsG: 2, fatG: 5, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'yogurt-greek', nameFa: 'ماست یونانی', nameEn: 'Greek yogurt', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 150, kcalPerUnit: 150, proteinG: 15, carbsG: 6, fatG: 7, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['ماست یونانی'] },
  { key: 'oats', nameFa: 'جو دوسر', nameEn: 'Oats', unitFa: 'پیمانه پخته', unitEn: 'cup cooked', gramsPerUnit: 80, kcalPerUnit: 150, proteinG: 5, carbsG: 27, fatG: 3, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['جو دوسر'] },
  { key: 'oats-dry', nameFa: 'جو دوسر خشک', nameEn: 'Oats dry', unitFa: 'پیمانه خشک', unitEn: 'cup dry', gramsPerUnit: 40, kcalPerUnit: 155, proteinG: 5, carbsG: 27, fatG: 3, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'pasta', nameFa: 'پاستا پخته', nameEn: 'Pasta cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 140, kcalPerUnit: 220, proteinG: 7, carbsG: 43, fatG: 1, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['پاستا'] },
  { key: 'bread-white', nameFa: 'نان سفید', nameEn: 'White bread', unitFa: 'برش', unitEn: 'slice', gramsPerUnit: 30, kcalPerUnit: 80, proteinG: 3, carbsG: 15, fatG: 1, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'bread-wholewheat', nameFa: 'نان سبوس‌دار', nameEn: 'Whole wheat bread', unitFa: 'برش', unitEn: 'slice', gramsPerUnit: 30, kcalPerUnit: 80, proteinG: 4, carbsG: 14, fatG: 1, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'bulgur', nameFa: 'بلغور', nameEn: 'Bulgur cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 150, kcalPerUnit: 150, proteinG: 5, carbsG: 34, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['بلغور'] },
  { key: 'quinoa', nameFa: 'کینوا', nameEn: 'Quinoa cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 150, kcalPerUnit: 170, proteinG: 6, carbsG: 29, fatG: 3, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['کینوا'] },
  { key: 'rice-brown', nameFa: 'برنج قهوه‌ای پخته', nameEn: 'Brown rice cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 150, kcalPerUnit: 170, proteinG: 4, carbsG: 35, fatG: 2, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'potato', nameFa: 'سیب‌زمینی', nameEn: 'Potato', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 170, kcalPerUnit: 130, proteinG: 3, carbsG: 30, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['سیب زمینی'] },
  { key: 'sweet-potato', nameFa: 'سیب‌زمینی شیرین', nameEn: 'Sweet potato', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 130, kcalPerUnit: 110, proteinG: 2, carbsG: 26, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'lentil', nameFa: 'عدس پخته', nameEn: 'Lentils cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 150, kcalPerUnit: 170, proteinG: 12, carbsG: 28, fatG: 1, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['عدس'] },
  { key: 'chickpea', nameFa: 'نخود پخته', nameEn: 'Chickpeas cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 150, kcalPerUnit: 210, proteinG: 11, carbsG: 35, fatG: 4, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['نخود'] },
  { key: 'red-bean', nameFa: 'لوبیا قرمز پخته', nameEn: 'Red beans cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 150, kcalPerUnit: 190, proteinG: 12, carbsG: 32, fatG: 1, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['لوبیا قرمز'] },
  { key: 'white-bean', nameFa: 'لوبیا سفید پخته', nameEn: 'White beans cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 150, kcalPerUnit: 180, proteinG: 12, carbsG: 31, fatG: 1, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'mung-bean', nameFa: 'ماش پخته', nameEn: 'Mung beans cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 150, kcalPerUnit: 160, proteinG: 11, carbsG: 28, fatG: 1, source: 'general-estimate', estimate: true, rangeKcal: [140, 180], aliasesFa: [] },
  { key: 'split-pea', nameFa: 'لپه پخته', nameEn: 'Split peas cooked', unitFa: 'پیمانه', unitEn: 'cup', gramsPerUnit: 150, kcalPerUnit: 170, proteinG: 11, carbsG: 29, fatG: 1, source: 'general-estimate', estimate: true, rangeKcal: [150, 190], aliasesFa: [] },
  { key: 'cucumber', nameFa: 'خیار', nameEn: 'Cucumber', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 100, kcalPerUnit: 15, proteinG: 1, carbsG: 3, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['خیار'] },
  { key: 'tomato', nameFa: 'گوجه فرنگی', nameEn: 'Tomato', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 120, kcalPerUnit: 22, proteinG: 1, carbsG: 5, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['گوجه', 'گوجه فرنگی'] },
  { key: 'lettuce', nameFa: 'کاهو', nameEn: 'Lettuce', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 50, kcalPerUnit: 8, proteinG: 1, carbsG: 1, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['کاهو'] },
  { key: 'spinach', nameFa: 'اسفناج', nameEn: 'Spinach', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 30, kcalPerUnit: 7, proteinG: 1, carbsG: 1, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['اسفناج'] },
  { key: 'carrot', nameFa: 'هویج', nameEn: 'Carrot', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 60, kcalPerUnit: 25, proteinG: 1, carbsG: 6, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['هویج'] },
  { key: 'onion', nameFa: 'پیاز', nameEn: 'Onion', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 100, kcalPerUnit: 40, proteinG: 1, carbsG: 9, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'eggplant', nameFa: 'بادمجان', nameEn: 'Eggplant', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 200, kcalPerUnit: 50, proteinG: 2, carbsG: 12, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'zucchini', nameFa: 'کدو', nameEn: 'Zucchini', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 150, kcalPerUnit: 30, proteinG: 2, carbsG: 6, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'pepper', nameFa: 'فلفل دلمه‌ای', nameEn: 'Bell pepper', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 120, kcalPerUnit: 30, proteinG: 1, carbsG: 7, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'broccoli', nameFa: 'بروکلی', nameEn: 'Broccoli', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 90, kcalPerUnit: 30, proteinG: 3, carbsG: 6, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['بروکلی'] },
  { key: 'cauliflower', nameFa: 'گل کلم', nameEn: 'Cauliflower', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 100, kcalPerUnit: 25, proteinG: 2, carbsG: 5, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'mushroom', nameFa: 'قارچ', nameEn: 'Mushroom', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 70, kcalPerUnit: 15, proteinG: 2, carbsG: 2, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['قارچ'] },
  { key: 'corn', nameFa: 'ذرت', nameEn: 'Corn', unitFa: 'بلال', unitEn: 'ear', gramsPerUnit: 100, kcalPerUnit: 100, proteinG: 3, carbsG: 22, fatG: 1, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'green-bean', nameFa: 'لوبیا سبز', nameEn: 'Green beans', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 100, kcalPerUnit: 30, proteinG: 2, carbsG: 7, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'olive', nameFa: 'زیتون', nameEn: 'Olives', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 5, kcalPerUnit: 5, proteinG: 0, carbsG: 0, fatG: 1, source: 'general-estimate', estimate: true, rangeKcal: [4, 7], aliasesFa: ['زیتون'] },
  { key: 'apple', nameFa: 'سیب', nameEn: 'Apple', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 180, kcalPerUnit: 95, proteinG: 0, carbsG: 25, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['سیب'] },
  { key: 'banana', nameFa: 'موز', nameEn: 'Banana', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 120, kcalPerUnit: 105, proteinG: 1, carbsG: 27, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['موز'] },
  { key: 'orange', nameFa: 'پرتقال', nameEn: 'Orange', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 130, kcalPerUnit: 60, proteinG: 1, carbsG: 15, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['پرتقال'] },
  { key: 'grapes', nameFa: 'انگور', nameEn: 'Grapes', unitFa: 'خوشه کوچک', unitEn: 'small bunch', gramsPerUnit: 150, kcalPerUnit: 100, proteinG: 1, carbsG: 27, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['انگور'] },
  { key: 'watermelon', nameFa: 'هندوانه', nameEn: 'Watermelon', unitFa: 'برش', unitEn: 'slice', gramsPerUnit: 280, kcalPerUnit: 85, proteinG: 2, carbsG: 21, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['هندوانه'] },
  { key: 'melon', nameFa: 'طالبی', nameEn: 'Melon', unitFa: 'برش', unitEn: 'slice', gramsPerUnit: 150, kcalPerUnit: 55, proteinG: 1, carbsG: 13, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['طالبی'] },
  { key: 'peach', nameFa: 'هلو', nameEn: 'Peach', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 150, kcalPerUnit: 60, proteinG: 1, carbsG: 15, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['هلو'] },
  { key: 'pear', nameFa: 'گلابی', nameEn: 'Pear', unitFa: 'عدد متوسط', unitEn: 'medium', gramsPerUnit: 170, kcalPerUnit: 100, proteinG: 1, carbsG: 27, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['گلابی'] },
  { key: 'plum', nameFa: 'آلو', nameEn: 'Plum', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 65, kcalPerUnit: 30, proteinG: 0, carbsG: 8, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'cherry', nameFa: 'گیلاس', nameEn: 'Cherries', unitFa: 'کاسه کوچک', unitEn: 'small bowl', gramsPerUnit: 100, kcalPerUnit: 50, proteinG: 1, carbsG: 12, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['گیلاس'] },
  { key: 'strawberry', nameFa: 'توت فرنگی', nameEn: 'Strawberry', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 150, kcalPerUnit: 50, proteinG: 1, carbsG: 12, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['توت فرنگی'] },
  { key: 'kiwi', nameFa: 'کیوی', nameEn: 'Kiwi', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 75, kcalPerUnit: 40, proteinG: 1, carbsG: 10, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['کیوی'] },
  { key: 'mango', nameFa: 'انبه', nameEn: 'Mango', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 200, kcalPerUnit: 130, proteinG: 1, carbsG: 33, fatG: 1, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['انبه'] },
  { key: 'pomegranate', nameFa: 'انار', nameEn: 'Pomegranate', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 280, kcalPerUnit: 230, proteinG: 5, carbsG: 53, fatG: 3, source: 'general-estimate', estimate: true, rangeKcal: [200, 260], aliasesFa: ['انار'] },
  { key: 'fig', nameFa: 'انجیر', nameEn: 'Fig', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 50, kcalPerUnit: 35, proteinG: 0, carbsG: 9, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['انجیر'] },
  { key: 'date', nameFa: 'خرما', nameEn: 'Date', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 20, kcalPerUnit: 65, proteinG: 0, carbsG: 18, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['خرما'] },
  { key: 'walnut', nameFa: 'گردو', nameEn: 'Walnut', unitFa: 'مشت', unitEn: 'handful', gramsPerUnit: 30, kcalPerUnit: 195, proteinG: 4, carbsG: 4, fatG: 18, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['گردو'] },
  { key: 'almond', nameFa: 'بادام', nameEn: 'Almond', unitFa: 'مشت', unitEn: 'handful', gramsPerUnit: 30, kcalPerUnit: 175, proteinG: 6, carbsG: 6, fatG: 15, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['بادام'] },
  { key: 'pistachio', nameFa: 'پسته', nameEn: 'Pistachio', unitFa: 'مشت', unitEn: 'handful', gramsPerUnit: 30, kcalPerUnit: 170, proteinG: 6, carbsG: 8, fatG: 13, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['پسته'] },
  { key: 'hazelnut', nameFa: 'فندق', nameEn: 'Hazelnut', unitFa: 'مشت', unitEn: 'handful', gramsPerUnit: 30, kcalPerUnit: 185, proteinG: 4, carbsG: 5, fatG: 18, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['فندق'] },
  { key: 'cashew', nameFa: 'بادام هندی', nameEn: 'Cashew', unitFa: 'مشت', unitEn: 'handful', gramsPerUnit: 30, kcalPerUnit: 165, proteinG: 5, carbsG: 9, fatG: 13, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['بادام هندی'] },
  { key: 'peanut', nameFa: 'بادام زمینی', nameEn: 'Peanut', unitFa: 'مشت', unitEn: 'handful', gramsPerUnit: 30, kcalPerUnit: 170, proteinG: 7, carbsG: 5, fatG: 14, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['بادام زمینی'] },
  { key: 'sunflower-seed', nameFa: 'تخمه آفتابگردان', nameEn: 'Sunflower seeds', unitFa: 'مشت', unitEn: 'handful', gramsPerUnit: 30, kcalPerUnit: 170, proteinG: 6, carbsG: 6, fatG: 15, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['تخمه'] },
  { key: 'pumpkin-seed', nameFa: 'تخمه کدو', nameEn: 'Pumpkin seeds', unitFa: 'مشت', unitEn: 'handful', gramsPerUnit: 30, kcalPerUnit: 160, proteinG: 9, carbsG: 4, fatG: 14, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: [] },
  { key: 'tahini', nameFa: 'ارده', nameEn: 'Tahini', unitFa: 'قاشق غذاخوری', unitEn: 'tbsp', gramsPerUnit: 15, kcalPerUnit: 90, proteinG: 3, carbsG: 3, fatG: 8, source: 'general-estimate', estimate: true, rangeKcal: [80, 100], aliasesFa: ['ارده'] },
  { key: 'olive-oil', nameFa: 'روغن زیتون', nameEn: 'Olive oil', unitFa: 'قاشق غذاخوری', unitEn: 'tbsp', gramsPerUnit: 14, kcalPerUnit: 120, proteinG: 0, carbsG: 0, fatG: 14, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['روغن زیتون'] },
  { key: 'peanut-butter', nameFa: 'کره بادام زمینی', nameEn: 'Peanut butter', unitFa: 'قاشق غذاخوری', unitEn: 'tbsp', gramsPerUnit: 16, kcalPerUnit: 95, proteinG: 4, carbsG: 3, fatG: 8, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['کره بادام زمینی'] },
  { key: 'honey', nameFa: 'عسل', nameEn: 'Honey', unitFa: 'قاشق غذاخوری', unitEn: 'tbsp', gramsPerUnit: 21, kcalPerUnit: 65, proteinG: 0, carbsG: 17, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['عسل'] },
  { key: 'water', nameFa: 'آب', nameEn: 'Water', unitFa: 'لیوان', unitEn: 'glass', gramsPerUnit: 240, kcalPerUnit: 0, proteinG: 0, carbsG: 0, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['آب'] },
  { key: 'tea', nameFa: 'چای', nameEn: 'Tea (unsweetened)', unitFa: 'لیوان', unitEn: 'glass', gramsPerUnit: 240, kcalPerUnit: 0, proteinG: 0, carbsG: 0, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['چای'] },
  { key: 'tea-sugar', nameFa: 'چای با قند', nameEn: 'Tea with sugar cube', unitFa: 'لیوان', unitEn: 'glass', gramsPerUnit: 240, kcalPerUnit: 20, proteinG: 0, carbsG: 5, fatG: 0, source: 'general-estimate', estimate: true, rangeKcal: [15, 25], aliasesFa: [] },
  { key: 'coffee', nameFa: 'قهوه', nameEn: 'Coffee (black)', unitFa: 'فنجان', unitEn: 'cup', gramsPerUnit: 240, kcalPerUnit: 2, proteinG: 0, carbsG: 0, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['قهوه'] },
  { key: 'orange-juice', nameFa: 'آب پرتقال', nameEn: 'Orange juice', unitFa: 'لیوان', unitEn: 'glass', gramsPerUnit: 240, kcalPerUnit: 110, proteinG: 2, carbsG: 26, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['آب پرتقال'] },
  { key: 'soda', nameFa: 'نوشابه', nameEn: 'Soda', unitFa: 'لیوان', unitEn: 'glass', gramsPerUnit: 240, kcalPerUnit: 100, proteinG: 0, carbsG: 26, fatG: 0, source: 'general-estimate', estimate: true, rangeKcal: [90, 110], aliasesFa: ['نوشابه'] },
  { key: 'sugar-cube', nameFa: 'قند', nameEn: 'Sugar cube', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 5, kcalPerUnit: 20, proteinG: 0, carbsG: 5, fatG: 0, source: 'usda-staple', estimate: false, rangeKcal: null, aliasesFa: ['قند'] },
  { key: 'jam', nameFa: 'مربا', nameEn: 'Jam', unitFa: 'قاشق غذاخوری', unitEn: 'tbsp', gramsPerUnit: 20, kcalPerUnit: 55, proteinG: 0, carbsG: 14, fatG: 0, source: 'general-estimate', estimate: true, rangeKcal: [45, 65], aliasesFa: ['مربا'] },
  { key: 'chocolate-dark', nameFa: 'شکلات تلخ', nameEn: 'Dark chocolate', unitFa: 'تکه', unitEn: 'piece', gramsPerUnit: 20, kcalPerUnit: 110, proteinG: 2, carbsG: 8, fatG: 7, source: 'general-estimate', estimate: true, rangeKcal: [95, 125], aliasesFa: ['شکلات'] },
  { key: 'cake', nameFa: 'کیک', nameEn: 'Cake', unitFa: 'برش', unitEn: 'slice', gramsPerUnit: 80, kcalPerUnit: 280, proteinG: 4, carbsG: 38, fatG: 13, source: 'general-estimate', estimate: true, rangeKcal: [240, 330], aliasesFa: ['کیک'] },
];

export function foodDBByKey(key: string): FoodDBEntry | undefined {
  return FOOD_DB.find((f) => f.key === key);
}

export function searchFoodDB(query: string): FoodDBEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return FOOD_DB;
  return FOOD_DB.filter((f) => f.nameFa.includes(query.trim()) || f.nameEn.toLowerCase().includes(q) || f.key.includes(q));
}

/** Spoken Persian aliases per food key (from the voice-keyword curation). */
export const VOICE_ALIASES: Record<string, string[]> = {
  'abgoosht': ['آبگوشت'],
  'almond': ['بادام'],
  'apple': ['سیب'],
  'ash-doogh': ['آش دوغ'],
  'ash-jo': ['آش جو'],
  'ash-reshteh': ['آش رشته'],
  'baghali-polo': ['باقالی پلو'],
  'banana': ['موز'],
  'broccoli': ['بروکلی'],
  'bulgur': ['بلغور'],
  'cake': ['کیک'],
  'carrot': ['هویج'],
  'cashew': ['بادام هندی'],
  'chelo-kebab-koobideh': ['چلو کباب', 'چلو کباب کوبیده'],
  'chelo-morgh': ['چلو مرغ'],
  'chelo-sade': ['چلو', 'برنج'],
  'chenjeh': ['چنجه'],
  'cherry': ['گیلاس'],
  'chicken-breast': ['سینه مرغ', 'مرغ'],
  'chickpea': ['نخود'],
  'chocolate-dark': ['شکلات'],
  'coffee': ['قهوه'],
  'cucumber': ['خیار'],
  'date': ['خرما'],
  'dizi': ['دیزی'],
  'dolmeh': ['دلمه'],
  'doogh': ['دوغ'],
  'egg': ['تخم مرغ', 'تخم‌مرغ'],
  'fesenjan': ['فسنجان'],
  'fig': ['انجیر'],
  'gheimeh': ['قیمه'],
  'ghormeh-sabzi': ['قورمه سبزی', 'قورمه'],
  'grapes': ['انگور'],
  'haleem': ['حلیم'],
  'hazelnut': ['فندق'],
  'honey': ['عسل'],
  'jam': ['مربا'],
  'joojeh-kebab': ['جوجه', 'جوجه کباب'],
  'kareh': ['کره'],
  'kashk': ['کشک'],
  'kashk-bademjan': ['کشک بادمجان'],
  'kateh': ['کته'],
  'kebab-barg': ['کباب برگ'],
  'kebab-koobideh': ['کباب کوبیده', 'کوبیده'],
  'kebab-soltani': ['کباب سلطانی'],
  'khoresh-bademjan': ['خورشت بادمجان'],
  'khoresh-karafs': ['خورشت کرفس'],
  'kiwi': ['کیوی'],
  'koofteh-tabrizi': ['کوفته'],
  'kuku-sabzi': ['کوکو سبزی'],
  'kuku-sibzamini': ['کوکو سیب زمینی'],
  'lentil': ['عدس'],
  'lettuce': ['کاهو'],
  'mango': ['انبه'],
  'mast': ['ماست'],
  'mast-chekideh': ['ماست چکیده'],
  'mast-khiar': ['ماست و خیار'],
  'melon': ['طالبی'],
  'mirza-ghasemi': ['میرزا قاسمی'],
  'mushroom': ['قارچ'],
  'nan-barbari': ['نان بربری', 'بربری'],
  'nan-lavash': ['نان لواش', 'لواش'],
  'nan-sangak': ['نان سنگک', 'سنگک'],
  'nan-taftoon': ['نان تافتون', 'تافتون'],
  'oats': ['جو دوسر'],
  'olive': ['زیتون'],
  'olive-oil': ['روغن زیتون'],
  'orange': ['پرتقال'],
  'orange-juice': ['آب پرتقال'],
  'paneer': ['پنیر'],
  'pasta': ['پاستا'],
  'peach': ['هلو'],
  'peanut': ['بادام زمینی'],
  'peanut-butter': ['کره بادام زمینی'],
  'pear': ['گلابی'],
  'pistachio': ['پسته'],
  'pomegranate': ['انار'],
  'potato': ['سیب زمینی'],
  'quinoa': ['کینوا'],
  'red-bean': ['لوبیا قرمز'],
  'sabzi-polo': ['سبزی پلو'],
  'salad-olivieh': ['سالاد الویه'],
  'salad-shirazi': ['سالاد شیرازی'],
  'salmon': ['سالمون', 'ماهی'],
  'shir': ['شیر'],
  'soda': ['نوشابه'],
  'spinach': ['اسفناج'],
  'strawberry': ['توت فرنگی'],
  'sugar-cube': ['قند'],
  'sunflower-seed': ['تخمه'],
  'tahdig': ['ته دیگ'],
  'tahini': ['ارده'],
  'tea': ['چای'],
  'tomato': ['گوجه', 'گوجه فرنگی'],
  'tuna': ['تن ماهی'],
  'walnut': ['گردو'],
  'water': ['آب'],
  'watermelon': ['هندوانه'],
  'yogurt-greek': ['ماست یونانی'],
  'zereshk-polo': ['زرشک پلو'],
};

export function voiceSourcesFromDB(): { key: string; nameFa: string; nameEn: string; unitFa: string; unitEn: string; gramsPerUnit: number; kcalPerUnit: number; aliasesFa?: string[] }[] {
  return FOOD_DB.map((f) => ({ ...f, aliasesFa: VOICE_ALIASES[f.key] }));
}

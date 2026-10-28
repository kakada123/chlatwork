export interface FoodFilterGroup { label: string; options: Array<{ value: string; label: string }> }
export interface FoodFilterDefinition { key: string; label: string; labelKm: string; multiple: boolean; groups: FoodFilterGroup[] }
export type FoodFilters = Record<string, string | string[]>;

function group(label: string, items: string): FoodFilterGroup {
  return { label, options: items.split("|").map((entry) => {
    const pair = entry.trim().split("=");
    const name = pair[1] || pair[0];
    const value = pair.length > 1 ? pair[0] : name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return { value, label: name };
  }) };
}
function field(key: string, label: string, labelKm: string, groups: FoodFilterGroup[], multiple = false): FoodFilterDefinition {
  return { key, label, labelKm, groups, multiple };
}

// Public product vocabulary shared by the filter endpoint, validation and provider prompts.
export const FOOD_FILTERS: FoodFilterDefinition[] = [
  field("who", "Who", "ទៅជាមួយអ្នកណា?", [group("Who", "Solo / ម្នាក់ឯង|Couple / គូស្នេហ៍|First-Date Couple|Married Couple|Friends|Best Friends|Classmates|University Students|Coworkers|Office Team|Manager & Staff|Business Partners / Clients|Family|Parents|Parents with Baby|Parents with Kids|Single Parent with Kids|Grandparents / Seniors|Extended Family|Relatives|Siblings|Large Group|Tourists / Travelers|International Visitors|Online Friends Meeting Offline")]),
  field("eventOccasion", "Occasion", "ទៅក្នុងឱកាសអ្វី?", [
    group("Everyday", "Regular Meal|Quick Meal|Lunch Break|After Work|After School / University|Weekend Outing|Late-Night Cravings|Self-Date|Food Exploration|Comfort Eating"),
    group("Dating & Romance", "First Date|Casual Date|Romantic Dinner|Anniversary|Monthly Anniversary|Valentine's Day|Proposal|Double Date|Surprise Date|Reconciliation Date"),
    group("Friends & Social", "Friends Hangout|Reunion|Catch-Up|Gaming Night|Movie Date / Before Cinema / After Cinema|Drinking & Food|Weekend Chill|Karaoke & Food|Sports Watching|Farewell Gathering"),
    group("Family", "Family Lunch|Family Dinner|Family Reunion|Parents' Treat|Kids' Outing|Family Weekend|Mother's Day|Father's Day|Multigenerational Gathering"),
    group("Work & Business", "Team Lunch|Team Dinner|Team Building|Business Meeting|Client Meeting|Networking|Company Party|Promotion Celebration|Farewell Party|Project Completion|Staff Appreciation"),
    group("Celebration & Special", "Birthday|Graduation|Engagement|Wedding Anniversary|Baby Shower|Holiday Celebration|Khmer New Year|Pchum Ben|Water Festival|Christmas / New Year|Achievement Celebration"),
  ]),
  field("mealWindow", "Meal Time", "ញ៉ាំពេលណា?", [group("Suggested discovery times", "Early Breakfast (4–7 AM)|Breakfast (7–10 AM)|Brunch (10 AM–12 PM)|Lunch (11 AM–2 PM)|Afternoon Snack (2–5 PM)|Afternoon Tea|Early Dinner (5–7 PM)|Dinner (7–10 PM)|Late-Night Meal (10 PM–12 AM)|Midnight Food (12–3 AM)|Anytime / Open 24 Hours")]),
  field("budgetType", "Budget Type", "ប្រភេទថវិកា", [group("Budget Type", "Per Person|Total Group Budget|Flexible / No Fixed Budget|Best Value|Shared Bill|One Person Pays / Treating Others")]),
  field("budgetRange", "Budget Range", "កម្រិតថវិកាក្នុងម្នាក់ (USD)", [group("Per person", "Ultra Budget — Under $2|Student Budget — $2–$5|Affordable — $5–$10|Moderate — $10–$20|Comfortable — $20–$35|Premium — $35–$50|Luxury — $50–$100|Fine Dining — $100+")]),
  field("budgetPreferences", "Budget Preferences", "ចំណូលចិត្តតម្លៃ", [group("Budget Preferences", "Cheapest Nearby|Best Value for Money|Set Meal Deals|Combo Offers|Buffet Pricing|Happy Hour Offers|Shareable Meals|Discounts & Promotions")], true),
  field("locationDiscovery", "Discovery Location", "ស្វែងរកនៅទីណា?", [group("Discovery", "Near Me|Within 1 km|Within 3 km|Within 5 km|Within 10 km|Anywhere in City|Near Workplace|Near Home|Near University|Near Cinema|Near Shopping Mall|Near Tourist Attraction|Along My Route")]),
  field("area", "Phnom Penh Area", "តំបន់ក្នុងភ្នំពេញ", [group("Phnom Penh Areas", "BKK1 / BKK2 / BKK3|Toul Kork|Chamkar Mon|Tonle Bassac|TTP / Russian Market|Daun Penh|Riverside|Wat Phnom|Central Market|Olympic|Sen Sok|Phnom Penh Thmey|Chroy Changvar|Russey Keo|Mean Chey|Chbar Ampov|Kamboul|Dangkao|Prek Pnov|Koh Pich / Diamond Island|Koh Norea|Chom Chao|Boeng Tompun")]),
  field("city", "City / Province", "ក្រុង / ខេត្ត", [group("Cambodia", "Phnom Penh|Siem Reap|Battambang|Kampot|Kep|Sihanoukville|Kampong Cham|Kampong Speu|Kampong Chhnang|Pursat|Takeo|Kandal|Other Cambodian Provinces")]),
  field("vibes", "Vibe", "បរិយាកាសបែបណា?", [
    group("Romantic", "Romantic|Candlelight|Rooftop Date|Riverside Date|Garden Date|Private / Intimate|Sunset View"),
    group("Relaxing", "Quiet & Peaceful|Cozy|Homey|Nature & Greenery|Riverside|Lake View|Outdoor Breeze|Air-Conditioned Comfort|Work-Friendly|Study-Friendly"),
    group("Fun & Social", "Lively|Trendy|Youthful|Music & Entertainment|Live Band|Sports Bar|Group-Friendly|Party Atmosphere|Karaoke|Family-Friendly"),
    group("Aesthetic", "Instagrammable|Minimalist|Modern|Vintage|Traditional Khmer|Japanese Style|Korean Style|Luxury|Industrial|Artistic / Creative|Themed Restaurant"),
  ], true),
  field("foodTypes", "Food Type", "ចង់ញ៉ាំម្ហូបអ្វី?", [
    group("Cambodian Food", "bai-sach-chrouk=បាយសាច់ជ្រូក|bai-moan=បាយមាន់|bai-cha=បាយឆា|bai-lok-lak=បាយឡុកឡាក់|seafood-fried-rice=បាយឆាគ្រឿងសមុទ្រ|kuy-teav=គុយទាវ|nom-banh-chok=នំបញ្ចុក|banh-chev=បាញ់ឆែវ|samlor-machu=សម្លម្ជូរ|samlor-korko=សម្លកកូរ|amok=អាម៉ុក|prahok-ktis=ប្រហុកខ្ទិះ|sach-ang=សាច់អាំង|moan-dot=មាន់ដុត|trey-ang=ត្រីអាំង|khmer-food=ម្ហូបខ្មែរ"),
    group("Noodles & Soup", "Noodle Soup|Fried Noodles|Instant Noodle Dishes|Ramen|Udon|Pho|Rice Noodles|Hotpot|Kimchi Soup|Beef Soup|Seafood Soup|Chicken Soup"),
    group("Grilled & Meat", "Korean BBQ|Khmer BBQ|Japanese Yakiniku|Steak|Grilled Chicken|Grilled Pork|Grilled Beef|Grilled Seafood|Skewers"),
    group("Seafood", "Shrimp|Crab|Fish|Squid|Shellfish|Seafood Platter|Seafood Hotpot|Grilled Seafood|Fried Seafood"),
    group("Fast Food & Western", "Burger|Pizza|Fried Chicken|Sandwich|Pasta|Steak|Fries|Wraps|Tacos"),
    group("Healthy", "Salad|Steamed Food|Grilled Lean Protein|Low-Calorie Meals|Low-Oil Meals|High-Protein Meals|Vegetarian|Vegan|Plant-Based|Low-Sugar Options|Gluten-Free Options|Halal"),
    group("Desserts & Snacks", "Khmer Desserts|Cake|Ice Cream|Waffles|Pancakes|Donuts|Pastries|Bakery|Fruit Desserts|Fried Snacks|Street Snacks"),
    group("Drinks", "Coffee|Tea|Milk Tea|Matcha|Smoothies|Fresh Juice|Chocolate Drinks|Mocktails|Cocktails|Beer|Wine"),
  ], true),
  field("cuisines", "Cuisine", "ម្ហូបតាមប្រទេស", [group("Cuisine", "Khmer|Korean|Japanese|Chinese|Thai|Vietnamese|Western / American|Italian|French|Indian|Mexican|Middle Eastern|International / Fusion")], true),
  field("restaurantTypes", "Restaurant Type", "ប្រភេទហាង", [
    group("Everyday Dining", "Street Food Stall|Local Restaurant|Food Court|Hawker-Style Market|Casual Restaurant|Family Restaurant|Fast Food Restaurant|Canteen|Self-Service Restaurant|Takeaway Shop"),
    group("Specialty", "Noodle Shop|Soup Restaurant|Hotpot Restaurant|BBQ Restaurant|Seafood Restaurant|Steakhouse|Sushi Restaurant|Ramen Shop|Vegetarian Restaurant|Halal Restaurant|Breakfast Restaurant|Buffet Restaurant"),
    group("Cafe & Dessert", "Coffee Shop|Specialty Coffee Cafe|Study Cafe|Work-Friendly Cafe|Bakery Cafe|Dessert Cafe|Milk Tea Shop|Ice Cream Shop|Brunch Cafe|Pet-Friendly Cafe"),
    group("Experience Dining", "Rooftop Restaurant|Riverside Restaurant|Garden Restaurant|Fine Dining|Luxury Restaurant|Private Dining|Theme Restaurant|Live Music Restaurant|Karaoke Restaurant|Sports Bar|Pub & Restaurant|Beachfront Restaurant|Resort Restaurant"),
    group("Group & Events", "Family Dining Restaurant|Large-Group Restaurant|Private-Room Restaurant|Birthday Party Venue|Event Dining Hall|Corporate Dining Venue|All-You-Can-Eat Restaurant"),
  ], true),
  field("dietary", "Dietary", "របបអាហារ", [group("Dietary", "Vegetarian|Vegan|Halal|Allergies")], true),
  field("spiceLevel", "Spice Level", "កម្រិតហឹរ", [group("Spice Level", "None|Mild|Medium|Spicy|Extra Spicy")]),
  field("accessibility", "Accessibility", "ភាពងាយស្រួលចូលប្រើ", [group("Accessibility", "Wheelchair Access|Elevator|Ground Floor")], true),
  field("facilities", "Facilities", "បរិក្ខារហាង", [group("Facilities", "Parking|Wi-Fi|AC|Kids Area|Baby Chair|Toilet")], true),
  field("operatingStatus", "Operating Status", "ស្ថានភាពបើកហាង", [group("Operating Status", "Open Now|Open Late|24 Hours")]),
  field("services", "Service", "សេវាកម្ម", [group("Service", "Dine-in|Delivery|Takeaway|Reservation")], true),
  field("waitingTime", "Waiting Time", "ពេលរង់ចាំ", [group("Waiting Time", "No Wait|Short Wait|Reservation Recommended")]),
  field("weather", "Weather", "ទីតាំងសមនឹងអាកាសធាតុ", [group("Weather", "Rainy-Day Friendly|Outdoor|Indoor")], true),
  field("payments", "Payment", "វិធីបង់ប្រាក់", [group("Payment", "Cash|KHQR|Card")], true),
  field("foodPreferences", "Food Preference", "ចំណូលចិត្តអាហារ", [group("Food Preference", "No Pork|No Beef|No Seafood|No MSG Preference")], true),
  field("reviews", "Reviews", "ការវាយតម្លៃ", [group("Reviews", "Rating|Popularity|Local Favorites")]),
];

const DEFINITIONS = new Map(FOOD_FILTERS.map((definition) => [definition.key, definition]));
export function validFoodFilters(value: unknown): value is FoodFilters {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > FOOD_FILTERS.length) return false;
  return Object.entries(value).every(([key, selected]) => {
    const definition = DEFINITIONS.get(key);
    if (!definition) return false;
    const options = new Set(definition.groups.flatMap((group) => group.options.map((option) => option.value)));
    return definition.multiple
      ? Array.isArray(selected) && selected.length <= 8 && selected.every((value) => typeof value === "string" && options.has(value))
      : typeof selected === "string" && options.has(selected);
  });
}

export function describeFoodFilters(filters: FoodFilters = {}): Record<string, string[]> {
  return Object.fromEntries(Object.entries(filters).flatMap(([key, values]) => {
    const definition = DEFINITIONS.get(key);
    if (!definition) return [];
    const selected = new Set(Array.isArray(values) ? values : [values]);
    const labels = [...new Set(definition.groups.flatMap((group) => group.options.filter((option) => selected.has(option.value)).map((option) => option.label)))];
    return labels.length ? [[key, labels]] : [];
  }));
}

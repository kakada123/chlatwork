import { Injectable } from '@nestjs/common';
import { Place, RankedPlace, MealTime, Occasion } from './food.types';

export interface RecommendationCriteria {
  mealTime: MealTime;
  occasion: Occasion;
  peopleCount: number;
  totalBudget?: number;
  cuisine?: string;
  userLat: number;
  userLng: number;
}

@Injectable()
export class FoodRecommendationEngine {
  /**
   * Deterministically score and rank places based on user criteria.
   * Never fabricates pricing; clearly indicates when pricing is unverified.
   */
  public rankPlaces(places: Place[], criteria: RecommendationCriteria, limit: number = 5): RankedPlace[] {
    const scoredPlaces = places.map((place) => this.scorePlaceInternal(place, criteria));

    // Sort by rawScore descending, then by distance ascending
    scoredPlaces.sort((a, b) => {
      if (b.rawScore !== a.rawScore) {
        return b.rawScore - a.rawScore;
      }
      return (a.place.distanceMeters ?? 99999) - (b.place.distanceMeters ?? 99999);
    });

    return scoredPlaces.slice(0, limit).map((s) => ({
      ...s.place,
      score: Math.min(100, Math.max(10, Math.round(s.rawScore))),
      budgetFit: s.budgetFit,
      matchedFactors: s.matchedFactors,
    }));
  }

  private scorePlaceInternal(
    place: Place,
    criteria: RecommendationCriteria,
  ): { place: Place; rawScore: number; budgetFit: string; matchedFactors: string[] } {
    let score = 50; // baseline score
    const matchedFactors: string[] = [];
    const budgetPerPerson = criteria.totalBudget && criteria.peopleCount > 0
      ? criteria.totalBudget / criteria.peopleCount
      : undefined;

    // 1. Meal Time Compatibility
    const mealScore = this.evaluateMealTime(place, criteria.mealTime);
    score += mealScore.points;
    if (mealScore.factor) matchedFactors.push(mealScore.factor);

    // 2. Occasion & Group Compatibility
    const occasionScore = this.evaluateOccasion(place, criteria.occasion, criteria.peopleCount);
    score += occasionScore.points;
    if (occasionScore.factor) matchedFactors.push(occasionScore.factor);

    // 3. Cuisine Match
    if (criteria.cuisine && criteria.cuisine !== 'all') {
      const match = place.cuisine.some(
        (c) => c.toLowerCase() === criteria.cuisine!.toLowerCase() || c.includes(criteria.cuisine!.toLowerCase()),
      );
      if (match) {
        score += 20;
        matchedFactors.push(`ត្រូវនឹងមុខម្ហូបដែលចូលចិត្ត (${criteria.cuisine})`);
      }
    }

    // 4. Distance Proximity
    const distMeters = place.distanceMeters ?? 2000;
    if (distMeters <= 800) {
      score += 25;
      matchedFactors.push('នៅក្បែរទីតាំងអ្នក (ក្រោម 800 ម៉ែត្រ)');
    } else if (distMeters <= 1500) {
      score += 15;
      matchedFactors.push('ចម្ងាយជិតល្មម (ក្រោម 1.5 គ.ម)');
    } else if (distMeters <= 3000) {
      score += 8;
    }

    // 5. Budget Fit & Verification
    const budgetResult = this.evaluateBudget(place, budgetPerPerson);
    score += budgetResult.points;
    if (budgetResult.factor) matchedFactors.push(budgetResult.factor);

    // 6. Verified information bonus (curated or confirmed details get slight reliability bump)
    if (place.source === 'curated') {
      score += 10;
      matchedFactors.push('ព័ត៌មានបានផ្ទៀងផ្ទាត់ដោយក្រុមការងារ');
    }

    return {
      place,
      rawScore: score,
      budgetFit: budgetResult.explanation,
      matchedFactors,
    };
  }

  private evaluateMealTime(place: Place, mealTime: MealTime): { points: number; factor?: string } {
    if (mealTime === 'any') return { points: 5 };

    const amenity = place.amenity;
    const cuisines = place.cuisine.map((c) => c.toLowerCase());

    if (mealTime === 'breakfast') {
      if (amenity === 'cafe' || cuisines.includes('breakfast') || cuisines.includes('noodle') || cuisines.includes('bakery')) {
        return { points: 25, factor: 'ស័ក្តិសមសម្រាប់អាហារពេលព្រឹក / កាហ្វេ' };
      }
      return { points: -5 };
    }

    if (mealTime === 'lunch') {
      if (amenity === 'restaurant' || amenity === 'food_court' || cuisines.includes('khmer') || cuisines.includes('fast_food')) {
        return { points: 20, factor: 'ស័ក្តិសមសម្រាប់អាហារថ្ងៃត្រង់' };
      }
      return { points: 5 };
    }

    if (mealTime === 'snack') {
      if (amenity === 'cafe' || cuisines.includes('dessert') || cuisines.includes('cafe') || cuisines.includes('bakery')) {
        return { points: 25, factor: 'ស័ក្តិសមសម្រាប់កាហ្វេ / អាហារសម្រន់' };
      }
      return { points: -15 };
    }

    if (mealTime === 'dinner') {
      if (amenity === 'restaurant' || cuisines.includes('bbq') || cuisines.includes('hotpot') || cuisines.includes('khmer')) {
        return { points: 25, factor: 'ស័ក្តិសមសម្រាប់អាហារពេលល្ងាច' };
      }
      if (amenity === 'cafe') {
        return { points: -15 };
      }
      return { points: 5 };
    }

    return { points: 5 };
  }

  private evaluateOccasion(
    place: Place,
    occasion: Occasion,
    peopleCount: number,
  ): { points: number; factor?: string } {
    if (occasion === 'any') return { points: 5 };

    const features = place.features || {};

    if (occasion === 'first-date' || occasion === 'couple') {
      if (features.romantic || features.quiet || place.amenity === 'cafe') {
        return { points: 25, factor: 'បរិយាកាសស្ងប់ស្ងាត់ រ៉ូមែនទិក ស័ក្តិសមសម្រាប់គូស្នេហ៍' };
      }
      if (features.airConditioning) {
        return { points: 10, factor: 'មានម៉ាស៊ីនត្រជាក់ ផាសុកភាព' };
      }
      return { points: 0 };
    }

    if (occasion === 'family' || occasion === 'elderly') {
      if (features.familyFriendly || features.wheelchair || features.airConditioning) {
        return { points: 20, factor: 'មានផាសុកភាព ស័ក្តិសមសម្រាប់គ្រួសារ និងមនុស្សចាស់' };
      }
      if (place.amenity === 'restaurant') {
        return { points: 10 };
      }
      return { points: 0 };
    }

    if (occasion === 'friends') {
      if (features.groupFriendly || place.amenity === 'food_court' || place.cuisine.includes('bbq') || place.cuisine.includes('hotpot')) {
        return { points: 20, factor: 'ទីកន្លែងធំទូលាយ ស័ក្តិសមជួបជុំមិត្តភក្តិ' };
      }
      if (peopleCount > 4 && features.groupFriendly) {
        return { points: 15, factor: 'ងាយស្រួលរៀបចំតុសម្រាប់ក្រុមធំ' };
      }
      return { points: 8 };
    }

    if (occasion === 'solo') {
      if (place.amenity === 'cafe' || place.amenity === 'fast_food' || place.features?.takeaway) {
        return { points: 20, factor: 'ងាយស្រួលញ៉ាំម្នាក់ឯង ឬទិញយកទៅក្រៅ' };
      }
      return { points: 8 };
    }

    return { points: 5 };
  }

  private evaluateBudget(
    place: Place,
    budgetPerPerson?: number,
  ): { points: number; explanation: string; factor?: string } {
    if (!budgetPerPerson || budgetPerPerson <= 0) {
      if (place.isPriceVerified && place.estimatedPricePerPersonUsd) {
        return {
          points: 5,
          explanation: `ប្រហែល $${place.estimatedPricePerPersonUsd}/នាក់ (បានផ្ទៀងផ្ទាត់)`,
        };
      }
      return {
        points: 0,
        explanation: 'តម្លៃមិនទាន់ផ្ទៀងផ្ទាត់ (Price not verified)',
      };
    }

    // If pricing is NOT verified, be completely honest: no budget claims
    if (!place.isPriceVerified || !place.estimatedPricePerPersonUsd) {
      return {
        points: 0, // neutral: do not give or dock points falsely
        explanation: 'តម្លៃមិនទាន់ផ្ទៀងផ្ទាត់ (Price not verified)',
      };
    }

    const estCost = place.estimatedPricePerPersonUsd;

    if (estCost <= budgetPerPerson) {
      // Comfortably inside budget
      const savings = budgetPerPerson - estCost;
      return {
        points: 20,
        factor: `សមរម្យជាមួយថវិកា ($${estCost.toFixed(2)}/នាក់)`,
        explanation: `សមរម្យជាមួយកញ្ចប់ថវិកា (ប្រហែល $${estCost.toFixed(2)}/នាក់, សល់ $${savings.toFixed(2)}/នាក់)`,
      };
    } else {
      // Above budget
      const diff = estCost - budgetPerPerson;
      return {
        points: -15,
        explanation: `លើសថវិកាកំណត់បន្តិច (ប្រហែល $${estCost.toFixed(2)}/នាក់, ខ្វះ $${diff.toFixed(2)}/នាក់)`,
      };
    }
  }
}

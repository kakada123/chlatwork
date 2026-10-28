import { FoodRecommendationEngine, RecommendationCriteria } from './food-recommendation.engine';
import { Place } from './food.types';

describe('FoodRecommendationEngine', () => {
  let engine: FoodRecommendationEngine;

  beforeEach(() => {
    engine = new FoodRecommendationEngine();
  });

  const samplePlaces: Place[] = [
    {
      id: 'p1',
      name: 'Cafe Sunrise',
      amenity: 'cafe',
      cuisine: ['cafe', 'breakfast', 'coffee'],
      lat: 11.5564,
      lng: 104.9282,
      distanceMeters: 300,
      city: 'Phnom Penh',
      isPriceVerified: true,
      estimatedPricePerPersonUsd: 3.5,
      features: { airConditioning: true, quiet: true, romantic: true },
      source: 'curated',
    },
    {
      id: 'p2',
      name: 'Khmer BBQ Garden',
      amenity: 'restaurant',
      cuisine: ['khmer', 'bbq'],
      lat: 11.56,
      lng: 104.93,
      distanceMeters: 600,
      city: 'Phnom Penh',
      isPriceVerified: true,
      estimatedPricePerPersonUsd: 12.0,
      features: { groupFriendly: true, outdoorSeating: true },
      source: 'curated',
    },
    {
      id: 'p3',
      name: 'Local Street Noodle Stall',
      amenity: 'restaurant',
      cuisine: ['noodle', 'khmer'],
      lat: 11.558,
      lng: 104.925,
      distanceMeters: 400,
      city: 'Phnom Penh',
      isPriceVerified: false, // Unverified pricing
      features: { takeaway: true },
      source: 'google',
    },
  ];

  it('ranks breakfast places higher when mealTime is breakfast', () => {
    const criteria: RecommendationCriteria = {
      mealTime: 'breakfast',
      occasion: 'solo',
      peopleCount: 1,
      userLat: 11.5564,
      userLng: 104.9282,
    };

    const ranked = engine.rankPlaces(samplePlaces, criteria);
    expect(ranked[0].id).toBe('p1');
    expect(ranked[0].matchedFactors).toEqual(
      expect.arrayContaining([expect.stringContaining('អាហារពេលព្រឹក')]),
    );
  });

  it('ranks BBQ/group places higher for friends occasion and dinner', () => {
    const criteria: RecommendationCriteria = {
      mealTime: 'dinner',
      occasion: 'friends',
      peopleCount: 4,
      userLat: 11.5564,
      userLng: 104.9282,
    };

    const ranked = engine.rankPlaces(samplePlaces, criteria);
    expect(ranked[0].id).toBe('p2');
    expect(ranked[0].matchedFactors).toEqual(
      expect.arrayContaining([expect.stringContaining('មិត្តភក្តិ')]),
    );
  });

  it('enforces honest pricing policy: unverified prices show "Price not verified" and make no false claims', () => {
    const criteria: RecommendationCriteria = {
      mealTime: 'lunch',
      occasion: 'solo',
      peopleCount: 1,
      totalBudget: 5, // $5 total
      userLat: 11.5564,
      userLng: 104.9282,
    };

    const ranked = engine.rankPlaces(samplePlaces, criteria);
    const unverifiedPlace = ranked.find((p) => p.id === 'p3');

    expect(unverifiedPlace).toBeDefined();
    expect(unverifiedPlace!.budgetFit).toContain('Price not verified');
    expect(unverifiedPlace!.isPriceVerified).toBe(false);
  });

  it('properly evaluates verified budgets for affordable vs expensive restaurants', () => {
    // 3 friends with $10 total = $3.33/person budget
    const criteria: RecommendationCriteria = {
      mealTime: 'lunch',
      occasion: 'friends',
      peopleCount: 3,
      totalBudget: 10,
      userLat: 11.5564,
      userLng: 104.9282,
    };

    const ranked = engine.rankPlaces(samplePlaces, criteria);
    const expensivePlace = ranked.find((p) => p.id === 'p2'); // $12/person

    expect(expensivePlace).toBeDefined();
    expect(expensivePlace!.budgetFit).toContain('លើសថវិកាកំណត់'); // over budget explanation
  });
});

import { scaleRecipe } from './sop.service';

describe('Recipe Scaler (unit)', () => {
  const baseRecipe = {
    name: 'Bolognese Saus',
    basePortions: 10,
    ingredients: [
      { ingredientName: 'Gehakt', amount: 1.5, unit: 'kg' },
      { ingredientName: 'Tomatenpuree', amount: 0.5, unit: 'kg' },
      { ingredientName: 'Ui', amount: 3, unit: 'stuk' },
    ],
  };

  it('scales up to 20 portions correctly', () => {
    const result = scaleRecipe(baseRecipe, 20);
    expect(result.targetPortions).toBe(20);
    expect(result.ingredients[0].amount).toBe(3.0);  // 1.5/10*20
    expect(result.ingredients[1].amount).toBe(1.0);  // 0.5/10*20
    expect(result.ingredients[2].amount).toBe(6.0);  // 3/10*20
  });

  it('scales down to 5 portions correctly', () => {
    const result = scaleRecipe(baseRecipe, 5);
    expect(result.ingredients[0].amount).toBe(0.8);  // 1.5/10*5 = 0.75 → rounded to 1 decimal = 0.8
    expect(result.ingredients[1].amount).toBe(0.3);  // 0.5/10*5 = 0.25 → 0.3 (Math.round(0.25*10)/10)
  });

  it('rounds to exactly 1 decimal place', () => {
    const recipe = {
      name: 'Test',
      basePortions: 3,
      ingredients: [{ ingredientName: 'Bloem', amount: 1, unit: 'kg' }],
    };
    const result = scaleRecipe(recipe, 7);
    // 1/3*7 = 2.333... → 2.3
    expect(result.ingredients[0].amount).toBe(2.3);
  });

  it('scales to target portions = base portions (identity)', () => {
    const result = scaleRecipe(baseRecipe, 10);
    expect(result.ingredients[0].amount).toBe(1.5);
  });

  it('scales to 35 portions', () => {
    const result = scaleRecipe(baseRecipe, 35);
    expect(result.ingredients[0].amount).toBe(5.3);  // 1.5/10*35 = 5.25 → 5.3
    expect(result.ingredients[2].amount).toBe(10.5);  // 3/10*35 = 10.5
  });
});

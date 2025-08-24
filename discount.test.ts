import { describe, it, expect, test } from 'bun:test';
import { calculateDiscount } from './discount';
import type { CartItem, DiscountCampaign } from './schema';

// Test data factories
const createCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
    name: 'Test Item',
    price: 100,
    category: 'Clothing',
    quantity: 1,
    ...overrides
});

const createFixedCoupon = (amount: number): DiscountCampaign => ({
    category: 'Coupon',
    type: 'Fixed',
    amount
});

const createPercentageCoupon = (percentage: number): DiscountCampaign => ({
    category: 'Coupon',
    type: 'Percentage',
    percentage
});

const createCategoryDiscount = (targetCategory: 'Clothing' | 'Accessories' | 'Electronics', percentage: number): DiscountCampaign => ({
    category: 'On Top',
    type: 'Percentage',
    targetCategory,
    percentage
});

const createPointsDiscount = (customerPoints: number): DiscountCampaign => ({
    category: 'On Top',
    type: 'Fixed',
    customerPoints
});

const createSeasonalDiscount = (everyXThb: number, discountYThb: number): DiscountCampaign => ({
    category: 'Seasonal',
    type: 'Special',
    everyXThb,
    discountYThb
});

describe('calculateDiscount', () => {
    describe('Basic functionality', () => {
        it('should calculate correct original total for single item', () => {
            const items: CartItem[] = [createCartItem({ price: 350, quantity: 1 })];
            const campaigns: DiscountCampaign[] = [];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(350);
            expect(result.finalTotal).toBe(350);
            expect(result.totalDiscount).toBe(0);
        });

        it('should calculate correct original total for multiple items', () => {
            const items: CartItem[] = [
                createCartItem({ name: 'T-Shirt', price: 350, quantity: 2 }),
                createCartItem({ name: 'Hat', price: 250, quantity: 1, category: 'Accessories' })
            ];
            const campaigns: DiscountCampaign[] = [];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(950); // (350 * 2) + 250
            expect(result.finalTotal).toBe(950);
            expect(result.totalDiscount).toBe(0);
        });
    });

    describe('Coupon campaigns', () => {
        describe('Fixed amount coupon', () => {
            it('should apply fixed amount discount correctly', () => {
                const items: CartItem[] = [
                    createCartItem({ name: 'T-Shirt', price: 350 }),
                    createCartItem({ name: 'Hat', price: 250, category: 'Accessories' })
                ];
                const campaigns: DiscountCampaign[] = [createFixedCoupon(50)];

                const result = calculateDiscount(items, campaigns);

                expect(result.originalTotal).toBe(600);
                expect(result.finalTotal).toBe(550);
                expect(result.totalDiscount).toBe(50);
            });

            it('should handle fixed amount larger than total', () => {
                const items: CartItem[] = [createCartItem({ price: 100 })];
                const campaigns: DiscountCampaign[] = [createFixedCoupon(150)];

                const result = calculateDiscount(items, campaigns);

                expect(result.finalTotal).toBe(0); // Should not go negative
            });
        });

        describe('Percentage coupon', () => {
            it('should apply percentage discount correctly', () => {
                const items: CartItem[] = [
                    createCartItem({ name: 'T-Shirt', price: 350 }),
                    createCartItem({ name: 'Hat', price: 250, category: 'Accessories' })
                ];
                const campaigns: DiscountCampaign[] = [createPercentageCoupon(10)];

                const result = calculateDiscount(items, campaigns);

                expect(result.originalTotal).toBe(600);
                expect(result.finalTotal).toBe(540);
                expect(result.totalDiscount).toBe(60);
            });

            it('should handle edge case of 0% discount', () => {
                const items: CartItem[] = [createCartItem({ price: 100 })];
                const campaigns: DiscountCampaign[] = [createPercentageCoupon(0)];

                const result = calculateDiscount(items, campaigns);

                expect(result.finalTotal).toBe(100);
                expect(result.totalDiscount).toBe(0);
            });

            it('should handle edge case of 100% discount', () => {
                const items: CartItem[] = [createCartItem({ price: 100 })];
                const campaigns: DiscountCampaign[] = [createPercentageCoupon(100)];

                const result = calculateDiscount(items, campaigns);

                expect(result.finalTotal).toBe(0);
                expect(result.totalDiscount).toBe(100);
            });
        });
    });

    describe('On Top campaigns', () => {
        describe('Category discount', () => {
            it('should apply category discount correctly - example from assignment', () => {
                const items: CartItem[] = [
                    createCartItem({ name: 'T-Shirt', price: 350, category: 'Clothing' }),
                    createCartItem({ name: 'Hoodie', price: 700, category: 'Clothing' }),
                    createCartItem({ name: 'Watch', price: 850, category: 'Accessories' }),
                    createCartItem({ name: 'Bag', price: 640, category: 'Accessories' })
                ];
                const campaigns: DiscountCampaign[] = [createCategoryDiscount('Clothing', 15)];

                const result = calculateDiscount(items, campaigns);

                expect(result.originalTotal).toBe(2540);
                // Clothing total: 350 + 700 = 1050
                // 15% of 1050 = 157.5
                expect(result.totalDiscount).toBe(157.5);
                expect(result.finalTotal).toBe(2382.5);
            });

            it('should only discount items in specified category', () => {
                const items: CartItem[] = [
                    createCartItem({ name: 'T-Shirt', price: 100, category: 'Clothing' }),
                    createCartItem({ name: 'Phone', price: 500, category: 'Electronics' })
                ];
                const campaigns: DiscountCampaign[] = [createCategoryDiscount('Clothing', 20)];

                const result = calculateDiscount(items, campaigns);

                expect(result.originalTotal).toBe(600);
                // Only 20% of clothing (100) = 20
                expect(result.totalDiscount).toBe(20);
                expect(result.finalTotal).toBe(580);
            });

            it('should handle category with no items', () => {
                const items: CartItem[] = [
                    createCartItem({ name: 'T-Shirt', price: 100, category: 'Clothing' })
                ];
                const campaigns: DiscountCampaign[] = [createCategoryDiscount('Electronics', 50)];

                const result = calculateDiscount(items, campaigns);

                expect(result.totalDiscount).toBe(0);
                expect(result.finalTotal).toBe(100);
            });
        });

        describe('Points discount', () => {
            it('should apply points discount correctly - example from assignment', () => {
                const items: CartItem[] = [
                    createCartItem({ name: 'T-Shirt', price: 350 }),
                    createCartItem({ name: 'Hat', price: 250, category: 'Accessories' }),
                    createCartItem({ name: 'Belt', price: 230, category: 'Accessories' })
                ];
                const campaigns: DiscountCampaign[] = [createPointsDiscount(68)];

                const result = calculateDiscount(items, campaigns);

                expect(result.originalTotal).toBe(830);
                // 68 points = 68 THB, but capped at 20% of 830 = 166
                // So discount should be 68
                expect(result.totalDiscount).toBe(68);
                expect(result.finalTotal).toBe(762);
            });

            it('should cap points discount at 20% of total', () => {
                const items: CartItem[] = [createCartItem({ price: 100 })];
                const campaigns: DiscountCampaign[] = [createPointsDiscount(50)]; // 50 points = 50 THB

                const result = calculateDiscount(items, campaigns);

                // 20% of 100 = 20, which is less than 50 points
                expect(result.totalDiscount).toBe(20);
                expect(result.finalTotal).toBe(80);
            });

            it('should handle zero points', () => {
                const items: CartItem[] = [createCartItem({ price: 100 })];
                const campaigns: DiscountCampaign[] = [createPointsDiscount(0)];

                const result = calculateDiscount(items, campaigns);

                expect(result.totalDiscount).toBe(0);
                expect(result.finalTotal).toBe(100);
            });
        });
    });

    describe('Seasonal campaigns', () => {
        it('should apply seasonal discount correctly - example from assignment', () => {
            const items: CartItem[] = [
                createCartItem({ name: 'T-Shirt', price: 350 }),
                createCartItem({ name: 'Hat', price: 250, category: 'Accessories' }),
                createCartItem({ name: 'Belt', price: 230, category: 'Accessories' })
            ];
            const campaigns: DiscountCampaign[] = [createSeasonalDiscount(300, 40)];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(830);
            // 830 / 300 = 2.766... = 2 (floor)
            // 2 * 40 = 80 discount
            expect(result.totalDiscount).toBe(80);
            expect(result.finalTotal).toBe(750);
        });

        it('should handle total less than threshold', () => {
            const items: CartItem[] = [createCartItem({ price: 200 })];
            const campaigns: DiscountCampaign[] = [createSeasonalDiscount(300, 40)];

            const result = calculateDiscount(items, campaigns);

            expect(result.totalDiscount).toBe(0); // 200 < 300, so no discount
            expect(result.finalTotal).toBe(200);
        });

        it('should handle multiple thresholds', () => {
            const items: CartItem[] = [createCartItem({ price: 950 })];
            const campaigns: DiscountCampaign[] = [createSeasonalDiscount(300, 40)];

            const result = calculateDiscount(items, campaigns);

            // 950 / 300 = 3.166... = 3 (floor)
            // 3 * 40 = 120 discount
            expect(result.totalDiscount).toBe(120);
            expect(result.finalTotal).toBe(830);
        });
    });

    describe('Multiple campaigns', () => {
        it('should apply campaigns in correct order: Coupon > On Top > Seasonal', () => {
            const items: CartItem[] = [
                createCartItem({ name: 'T-Shirt', price: 400, category: 'Clothing' }),
                createCartItem({ name: 'Hat', price: 200, category: 'Accessories' })
            ];
            const campaigns: DiscountCampaign[] = [
                createSeasonalDiscount(100, 20), // Should apply last
                createFixedCoupon(50),           // Should apply first
                createCategoryDiscount('Clothing', 10) // Should apply second
            ];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(600);

            // Order of application:
            // 1. Fixed coupon: 600 - 50 = 550
            // 2. Category discount: 10% of 400 (clothing) = 40, so 550 - 40 = 510
            // 3. Seasonal: 510 / 100 = 5, so 5 * 20 = 100, final: 510 - 100 = 410

            expect(result.finalTotal).toBe(410);
            expect(result.totalDiscount).toBe(190); // 50 + 40 + 100
        });

        it('should handle combination of percentage coupon and points discount', () => {
            const items: CartItem[] = [createCartItem({ price: 1000 })];
            const campaigns: DiscountCampaign[] = [
                createPercentageCoupon(10), // 10% of 1000 = 100, new total = 900
                createPointsDiscount(200)   // 200 points, but capped at 20% of 900 = 180
            ];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(1000);
            expect(result.totalDiscount).toBe(280); // 100 + 180
            expect(result.finalTotal).toBe(720);
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle empty cart', () => {
            const items: CartItem[] = [];
            const campaigns: DiscountCampaign[] = [];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(0);
            expect(result.finalTotal).toBe(0);
            expect(result.totalDiscount).toBe(0);
        });

        it('should handle items with zero price', () => {
            const items: CartItem[] = [createCartItem({ price: 0 })];
            const campaigns: DiscountCampaign[] = [createPercentageCoupon(10)];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(0);
            expect(result.finalTotal).toBe(0);
            expect(result.totalDiscount).toBe(0);
        });

        it('should round final total to 2 decimal places', () => {
            const items: CartItem[] = [createCartItem({ price: 700 })];
            const campaigns: DiscountCampaign[] = [createPercentageCoupon(34.55)];

            const result = calculateDiscount(items, campaigns);

            expect(result.finalTotal).toBe(458.15); // Should be properly rounded
        });

        it('should ensure final total is never negative', () => {
            const items: CartItem[] = [createCartItem({ price: 100 })];
            const campaigns: DiscountCampaign[] = [
                createFixedCoupon(80),
                createPointsDiscount(50), // This would be capped anyway
                createSeasonalDiscount(10, 50) // This could make it negative
            ];

            const result = calculateDiscount(items, campaigns);

            expect(result.finalTotal).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Validation scenarios', () => {
        it('should handle large quantities correctly', () => {
            const items: CartItem[] = [
                createCartItem({ price: 10, quantity: 1000 })
            ];
            const campaigns: DiscountCampaign[] = [createPercentageCoupon(5)];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(10000);
            expect(result.totalDiscount).toBe(500);
            expect(result.finalTotal).toBe(9500);
        });

        it('should handle very small discounts', () => {
            const items: CartItem[] = [createCartItem({ price: 100 })];
            const campaigns: DiscountCampaign[] = [createPercentageCoupon(0.01)];

            const result = calculateDiscount(items, campaigns);

            expect(result.totalDiscount).toBe(0.01);
            expect(result.finalTotal).toBe(99.99);
        });
    });

    describe('Real-world scenarios', () => {
        test('Black Friday sale scenario', () => {
            const items: CartItem[] = [
                createCartItem({ name: 'Gaming Laptop', price: 50000, category: 'Electronics' }),
                createCartItem({ name: 'Wireless Mouse', price: 1500, category: 'Electronics' }),
                createCartItem({ name: 'T-Shirt', price: 800, category: 'Clothing', quantity: 3 })
            ];
            const campaigns: DiscountCampaign[] = [
                createPercentageCoupon(15), // 15% off everything
                createCategoryDiscount('Electronics', 10), // Extra 10% off electronics
                createSeasonalDiscount(10000, 1000) // 1000 THB off every 10000 THB
            ];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(53900); // 50000 + 1500 + (800*3)
            // Should apply all discounts in correct order
            expect(result.finalTotal).toBeGreaterThan(0);
            expect(result.totalDiscount).toBeGreaterThan(0);
        });

        test('Loyalty program scenario', () => {
            const items: CartItem[] = [
                createCartItem({ name: 'Premium Shirt', price: 2500, category: 'Clothing' }),
                createCartItem({ name: 'Leather Wallet', price: 1800, category: 'Accessories' })
            ];
            const campaigns: DiscountCampaign[] = [
                createPointsDiscount(500) // Customer has 500 loyalty points
            ];

            const result = calculateDiscount(items, campaigns);

            expect(result.originalTotal).toBe(4300);
            // Points discount should be capped at 20% = 860 THB
            // But customer only has 500 points, so discount = 500 THB
            expect(result.totalDiscount).toBe(500);
            expect(result.finalTotal).toBe(3800);
        });
    });
});
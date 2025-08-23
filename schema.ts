import { z } from 'zod/v4';

// Enums
export const ItemCategory = z.enum(['Clothing', 'Accessories', 'Electronics']);
export const CampaignCategory = z.enum(['Coupon', 'On Top', 'Seasonal']);
export const DiscountType = z.enum(['Fixed', 'Percentage', 'Special']);


export type ItemCategory = z.infer<typeof ItemCategory>;
export type CampaignCategory = z.infer<typeof CampaignCategory>;
export type DiscountType = z.infer<typeof DiscountType>;



// Campaign Schemas
export const FixedAmountCampaignSchema = z.object({
    category: z.literal('Coupon'),
    type: z.literal('Fixed'),
    amount: z.number().min(0, 'Amount must be non-negative')
});

export const PercentageCouponCampaignSchema = z.object({
    category: z.literal('Coupon'),
    type: z.literal('Percentage'),
    percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100')
});

export const CategoryDiscountCampaignSchema = z.object({
    category: z.literal('On Top'),
    type: z.literal('Percentage'),
    targetCategory: ItemCategory,
    percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100')
});

export const PointsDiscountCampaignSchema = z.object({
    category: z.literal('On Top'),
    type: z.literal('Fixed'),
    customerPoints: z.number().int().min(0, 'Customer points must be non-negative')
});

export const SeasonalCampaignSchema = z.object({
    category: z.literal('Seasonal'),
    type: z.literal('Special'),
    everyXThb: z.number().min(1, 'Every X THB must be at least 1'),
    discountYThb: z.number().min(1, 'Discount Y THB must be at least 1')
});

// Union schema for all discount campaigns
export const DiscountCampaignSchema = z.union([
    FixedAmountCampaignSchema,
    PercentageCouponCampaignSchema,
    CategoryDiscountCampaignSchema,
    PointsDiscountCampaignSchema,
    SeasonalCampaignSchema
]);

export type FixedAmountCampaign = z.infer<typeof FixedAmountCampaignSchema>;
export type PercentageCouponCampaign = z.infer<typeof PercentageCouponCampaignSchema>;
export type CategoryDiscountCampaign = z.infer<typeof CategoryDiscountCampaignSchema>;
export type PointsDiscountCampaign = z.infer<typeof PointsDiscountCampaignSchema>;
export type SeasonalCampaign = z.infer<typeof SeasonalCampaignSchema>;
export type DiscountCampaign = z.infer<typeof DiscountCampaignSchema>;

export const CartItemSchema = z.object({
    name: z.string().min(1, 'Item name is required'),
    price: z.number().min(0, 'Price must be non-negative'),
    category: ItemCategory,
    quantity: z.number().int().min(1, 'Quantity must be at least 1').optional().default(1)
});

export type CartItem = z.infer<typeof CartItemSchema>;


// Input Schema
export const CartSchema = z.object({
    items: z.array(CartItemSchema).min(1, 'Cart must contain at least one item'),
    discounts: z.array(DiscountCampaignSchema)
}).refine((data) => {
    const campaigns = data.discounts.filter(c => c.category === 'Coupon');
    return campaigns.length <= 1;
}, {
    message: 'Only one coupon campaign is allowed',
    path: ['discounts']
}).refine((data) => {
    const campaigns = data.discounts.filter(c => c.category === "On Top");
    return campaigns.length <= 1;
}, {
    message: 'Only one On Top campaign allowed',
    path: ['discounts']
}).refine((data) => {
    const campaigns = data.discounts.filter(c => c.category === "Seasonal");
    return campaigns.length <= 1;
}, {
    message: 'Only one Seasonal campaign allowed',
    path: ['discounts']
});

export type Cart = z.infer<typeof CartSchema>;

export const DiscountResultSchema = z.object({
    originalTotal: z.number().min(0),
    finalTotal: z.number().min(0),
    totalDiscount: z.number().min(0),
    appliedCampaigns: z.array(z.object({
        category: CampaignCategory,
        discountAmount: z.number().min(0)
    }))
});

export type DiscountResult = z.infer<typeof DiscountResultSchema>;
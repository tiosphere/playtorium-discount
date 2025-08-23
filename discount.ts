import { CampaignCategory, type CartItem, type CategoryDiscountCampaign, type DiscountCampaign, type DiscountResult, type FixedAmountCampaign, type PercentageCouponCampaign, type PointsDiscountCampaign, type SeasonalCampaign } from "./schema";

const POINTS_CAP_PERCENTAGE = 0.2; // 20%
const POINTS_TO_THB_RATIO = 1;

export function calculateDiscount(cartItems: CartItem[], campaigns: DiscountCampaign[]): DiscountResult {
    const originalTotal = calculateOriginalTotal(cartItems);
    let currentTotal = originalTotal;
    const appliedCampaigns: { category: CampaignCategory; discountAmount: number; }[] = [];
    const campaignsByCategory = categorizeCampaigns(campaigns);

    // Apply campaigns in order: Coupon > On Top > Seasonal
    // 1. Apply Coupon campaigns (only one allowed - validated by Zod)
    const couponDiscount = applyCouponCampaign(currentTotal, campaignsByCategory.coupon);
    currentTotal -= couponDiscount;
    appliedCampaigns.push({
        category: "Coupon",
        discountAmount: couponDiscount
    });

    // 2. Apply On Top campaigns
    const onTopDiscount = applyOnTopCampaign(currentTotal, cartItems, campaignsByCategory.onTop);
    currentTotal -= onTopDiscount;
    appliedCampaigns.push({
        category: "On Top",
        discountAmount: onTopDiscount
    });

    // 3. Apply Seasonal campaigns
    const seasonalDiscount = applySeasonalCampaign(currentTotal, campaignsByCategory.seasonal);
    currentTotal -= seasonalDiscount;
    appliedCampaigns.push({
        category: "Seasonal",
        discountAmount: seasonalDiscount
    });


    currentTotal = Math.max(0, currentTotal); // Ensure final total is not negative

    const result: DiscountResult = {
        originalTotal,
        finalTotal: Math.round(currentTotal * 100) / 100, // Round to 2 decimal places
        totalDiscount: Math.round((originalTotal - currentTotal) * 100) / 100,
        appliedCampaigns
    };

    return result
}

function calculateOriginalTotal(cartItems: CartItem[]): number {
    return cartItems.reduce((total, item) => {
        const quantity = item.quantity || 1;
        return total + (item.price * quantity);
    }, 0);
}

function categorizeCampaigns(campaigns: DiscountCampaign[]) {
    let coupon: FixedAmountCampaign | PercentageCouponCampaign | undefined;
    let onTop: CategoryDiscountCampaign | PointsDiscountCampaign | undefined;
    let seasonal: SeasonalCampaign | undefined;
    for (const c of campaigns) {
        switch (c.category) {
            case "Coupon":
                if (coupon) {
                    throw Error("Can only use one Coupon")
                }
                coupon = c
                break;
            case "On Top":
                if (coupon) {
                    throw Error("Can only use one On-top discount")
                }
                onTop = c
                break;
            case "Seasonal":
                if (coupon) {
                    throw Error("Can only use one Seasonal discount")
                }
                seasonal = c
                break;
        }
    }
    return {
        coupon,
        onTop,
        seasonal
    };
}

function applyCouponCampaign(currentTotal: number, campaign?: FixedAmountCampaign | PercentageCouponCampaign): number {
    if (campaign?.type === 'Fixed') {
        return campaign.amount;
    } else if (campaign?.type === 'Percentage') {
        const discountAmount = (currentTotal * campaign.percentage) / 100;
        return discountAmount;
    } else {
        return 0;
    }
}

function applyOnTopCampaign(currentTotal: number, cartItems: CartItem[], campaign?: CategoryDiscountCampaign | PointsDiscountCampaign) {
    if (campaign?.type === 'Fixed') {
        return Math.min(campaign.customerPoints * POINTS_TO_THB_RATIO, currentTotal * POINTS_CAP_PERCENTAGE);
    } else if (campaign?.type === 'Percentage') {
        const categoryTotal = calculateOriginalTotal(cartItems.filter(_ => _.category == campaign.targetCategory))
        const discountAmount = (categoryTotal * campaign.percentage) / 100;
        return discountAmount;
    } else {
        return 0;
    }
}

function applySeasonalCampaign(currentTotal: number, campaign?: SeasonalCampaign): number {
    if (campaign) {
        return Math.floor(currentTotal / campaign.everyXThb) * campaign.discountYThb
    } else {
        return 0;
    }
}
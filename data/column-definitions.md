### Column definitions

- `Last Ingested Ts Time`: last ingestion timestamp
- `City Name`: city name for given smart promotion
- `Provider ID`: enrolled smart promotion / trade event provider_id
- `Provider Name`: Provider name from dim_provider_v2.
- `Account Manager Name`: account manager for given provider
- `Smart Promo ID`: Smart Promotion ID. Smart Promotion can contain multiple offer_id's. Trade events do not have smart_promo_id.
- `Smart Promo Enrollment State`: smart promo enrollment state: active/finished/disabled
- `Smart Promo Type`: smart_promotion / trade_event
- `Smart Promo Provider Enrollment Start Ts Utc Time`: timestamp when given provider's Smart Promotions started
- `Smart Promo Provider Enrollment End Ts Utc Time`: timestamp when given provider's Smart Promotions ended
- `Smart Promo Offer ID`: Delivery offer ID. Offers are assigned to Smart Promotions and Trade Events. Each offer_id has either campaign_id or bundle_id assigned to it
- `Smart Promo Offer Enrollment State`: smart promo offer enrollment state: active/finished/disabled
- `Smart Promo Offer Type`: Offer type
- `Smart Promo Offer Mode`: smart_promo offer mode: whitebox/blackbox, where whitebox = customly selected offers & blackbox = all offers. NULL for trade_event
- `Smart Promo Offer Provider Enrollment Start Ts Utc Time`: timestamp when given provider's offer actually became available
- `Smart Promo Offer Provider Enrollment End Ts Utc Time`: timestamp when given provider's offer ended
- `Campaign ID`: campaign_id
- `Campaign Spend Objective`: Trade event or Smart Promo campaign spend_objective
- `Discount Type`: Human-readable discount type (Menu Discounts / Free Base Delivery / Free Full Delivery / without).
- `Bonus Data Percentage`: Raw bonus/discount type from the targeted campaign (mapped from targeted_campaign_discount_type).
- `Bonus Data Max Value`: Maximum discount value per order for the targeted campaign.
- `Min Basket Size`: Minimum basket size required to be eligible for the promotion, extracted from targeted_campaign_rules.min_provider_price.
- `Cost Share Percentage`: Merchant cost share percentage for the campaign (from targeted campaign).
- `Count Orders`: number of order from given smart promotion offer
- `Count Unique Users`: Number of distinct users who placed an order under the promotion.
- `Count New Users for Provider`: Number of orders from users who are new to the specific provider (from int_order_from_new_user.is_new_user_for_provider).
- `Count New Users for Bolt`: Number of orders where the user placed their first-ever Bolt Food delivery order (from dim_user_delivery.first_delivery_order_id).


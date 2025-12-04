# Discount Calculator

**Project:** Playtorium Take-Home Assignment - Discount Module

A TypeScript-based discount calculation system that applies multiple discount campaigns to shopping cart items according to specific business rules.

## Table of Contents

- [Discount Calculator](#discount-calculator)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Setup](#setup)
  - [Usage](#usage)
    - [Command Line Interface](#command-line-interface)
    - [Programmatic Usage](#programmatic-usage)
    - [Docker Usage](#docker-usage)
  - [Discount Campaign Types](#discount-campaign-types)
    - [Coupon Campaigns](#coupon-campaigns)
      - [Fixed Amount Coupon](#fixed-amount-coupon)
      - [Percentage Coupon](#percentage-coupon)
    - [On Top Campaigns](#on-top-campaigns)
      - [Category Discount](#category-discount)
      - [Points Discount](#points-discount)
    - [Seasonal Campaigns](#seasonal-campaigns)
      - [Special Seasonal Campaign](#special-seasonal-campaign)
  - [Business Rules](#business-rules)
  - [Input Format](#input-format)
    - [Required Fields](#required-fields)
  - [Examples](#examples)
    - [Basic Example](#basic-example)
    - [Multiple Campaigns Example](#multiple-campaigns-example)
  - [Testing](#testing)
    - [Test Categories](#test-categories)
  - [Architecture](#architecture)
    - [Project Structure](#project-structure)
    - [Core Components](#core-components)
  - [Validation \& Error Handling](#validation--error-handling)
    - [Common Error Scenarios](#common-error-scenarios)
  - [Performance Considerations](#performance-considerations)
  - [Development](#development)
    - [Code Style](#code-style)
    - [Adding New Campaign Types](#adding-new-campaign-types)
  - [Assumptions](#assumptions)

## Overview

This discount calculator implements a comprehensive e-commerce discount system that can handle multiple types of promotional campaigns. The system follows a specific order of operations and includes validation to ensure accurate calculations.

The module processes shopping cart items and applies discount campaigns in a predetermined sequence: **Coupon → On Top → Seasonal**.

## Features

- ✅ **Multiple Discount Types**: Fixed amount, percentage, category-based, points-based, and seasonal discounts
- ✅ **Rule-Based Application**: Enforces business rules for campaign combinations and application order
- ✅ **Type Safety**: Full TypeScript implementation with Zod schema validation
- ✅ **CLI Interface**: Easy-to-use command-line interface for processing JSON files
- ✅ **Docker Support**: Containerized deployment ready
- ✅ **Comprehensive Testing**: 100% test coverage with edge case handling
- ✅ **Error Handling**: Robust validation and error reporting
- ✅ **Receipt Generation**: Formatted output showing calculation breakdown

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0 or higher)
- Node.js (if using npm/yarn instead of Bun)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd discount-calculator

# Install dependencies using Bun
bun install

# Or using npm
npm install
```

## Usage

### Command Line Interface

The primary way to use the discount calculator is through the CLI:

```bash
# Basic usage
bun run index.ts input.json

# Show help
bun run index.ts --help

# Example with provided test data
bun run index.ts ./data/example.json
```

### Programmatic Usage

```typescript
import { calculateDiscount } from './discount';
import type { CartItem, DiscountCampaign } from './schema';

const items: CartItem[] = [
  { name: 'T-Shirt', price: 350, category: 'Clothing', quantity: 1 },
  { name: 'Hat', price: 250, category: 'Accessories', quantity: 1 }
];

const campaigns: DiscountCampaign[] = [
  { category: 'Coupon', type: 'Fixed', amount: 50 }
];

const result = calculateDiscount(items, campaigns);
console.log(result);
```

### Docker Usage

```bash
# Build the Docker image
docker build -t discount-calculator .

# Run with default example
docker run discount-calculator

# Run with custom input file (inside data directory)
docker run -v ./data:/app/data discount-calculator bun run index.ts ./data/your-file.json
```

## Discount Campaign Types

### Coupon Campaigns

Applied first in the discount sequence. Only one coupon campaign allowed per transaction.

#### Fixed Amount Coupon
```json
{
  "category": "Coupon",
  "type": "Fixed",
  "amount": 50
}
```

#### Percentage Coupon
```json
{
  "category": "Coupon",
  "type": "Percentage",
  "percentage": 10
}
```

### On Top Campaigns

Applied after coupon campaigns. Only one on-top campaign allowed per transaction.

#### Category Discount
```json
{
  "category": "On Top",
  "type": "Percentage",
  "targetCategory": "Clothing",
  "percentage": 15
}
```

#### Points Discount
```json
{
  "category": "On Top",
  "type": "Fixed",
  "customerPoints": 68
}
```

### Seasonal Campaigns

Applied last in the discount sequence. Only one seasonal campaign allowed per transaction.

#### Special Seasonal Campaign
```json
{
  "category": "Seasonal",
  "type": "Special",
  "everyXThb": 300,
  "discountYThb": 40
}
```

## Business Rules

1. **Campaign Limits**: Only one campaign per category is allowed
2. **Application Order**: Campaigns are applied in sequence: Coupon → On Top → Seasonal
3. **Points Cap**: Points discount is capped at 20% of the current cart total
4. **Points Conversion**: 1 point = 1 THB discount value
5. **Non-negative Total**: Final cart total cannot be negative
6. **Category Targeting**: Category discounts only apply to items in the specified category
7. **Seasonal Threshold**: Seasonal discounts only apply when cart total meets minimum threshold

## Input Format

The system accepts JSON input with the following structure:

```json
{
  "items": [
    {
      "name": "Item Name",
      "price": 100,
      "category": "Clothing|Accessories|Electronics",
      "quantity": 1
    }
  ],
  "discounts": [
    {
      "category": "Coupon|On Top",
      "type": "Fixed|Percentage",
      // Additional parameters based on campaign type
    },{
      "category": "Seasonal",
      "type": "Special",
      "everyXThb": 500,
      "discountYThb": 50
    }
  ]
}
```

### Required Fields

- **items**: Array of cart items
  - `name`: String, item name
  - `price`: Number, item price (≥ 0)
  - `category`: Enum, one of "Clothing", "Accessories", "Electronics"
  - `quantity`: Number, item quantity (optional, defaults to 1)

- **discounts**: Array of discount campaigns
  - `category`: Enum, campaign category
  - `type`: Enum, discount type
  - Additional parameters vary by campaign type

## Examples

### Basic Example

```json
{
  "items": [
    {
      "name": "T-Shirt",
      "price": 350,
      "category": "Clothing"
    },
    {
      "name": "Hat",
      "price": 250,
      "category": "Accessories"
    }
  ],
  "discounts": [
    {
      "category": "Coupon",
      "type": "Fixed",
      "amount": 50
    }
  ]
}
```

**Output:**
- Original Total: 600 THB
- Final Total: 550 THB
- Total Discount: 50 THB

### Multiple Campaigns Example

```json
{
  "items": [
    {
      "name": "T-Shirt",
      "price": 350,
      "category": "Clothing"
    },
    {
      "name": "Hoodie",
      "price": 700,
      "category": "Clothing"
    },
    {
      "name": "Watch",
      "price": 850,
      "category": "Accessories"
    }
  ],
  "discounts": [
    {
      "category": "Coupon",
      "type": "Percentage",
      "percentage": 10
    },
    {
      "category": "On Top",
      "type": "Percentage",
      "targetCategory": "Clothing",
      "percentage": 15
    },
    {
      "category": "Seasonal",
      "type": "Special",
      "everyXThb": 500,
      "discountYThb": 50
    }
  ]
}
```

## Testing

The project includes comprehensive test coverage:

```bash
# Run all tests 
bun test

# Run all tests with report
bun test --coverage

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test discount.test.ts
```

### Test Categories

- **Basic Functionality**: Cart calculation, single items, multiple items
- **Coupon Campaigns**: Fixed and percentage coupons with edge cases
- **On Top Campaigns**: Category discounts and points system
- **Seasonal Campaigns**: Threshold-based discounts
- **Multiple Campaigns**: Complex scenarios with multiple discount types
- **Edge Cases**: Empty carts, zero prices, very large numbers
- **Validation**: Schema validation and error handling
- **Real-world Scenarios**: Black Friday sales, loyalty programs

## Architecture

### Project Structure

```
├── schema.ts           # Zod schemas and type definitions
├── discount.ts         # Core discount calculation logic
├── index.ts           # CLI interface and main entry point
├── discount.test.ts   # Comprehensive test suite
├── dockerfile         # Docker container configuration
├── package.json       # Project dependencies and scripts
└── data/
    └── example.json   # Sample input data
```

### Core Components

1. **Schema Layer** (`schema.ts`): Type-safe data structures with validation
2. **Business Logic** (`discount.ts`): Core discount calculation algorithms
3. **Presentation Layer** (`index.ts`): CLI interface and output formatting
4. **Test Suite** (`discount.test.ts`): Comprehensive test coverage

## Validation & Error Handling

The system provides robust validation and error handling:

- **Schema Validation**: Zod schemas ensure type safety and data integrity
- **Business Rule Validation**: Enforces campaign limits and combinations
- **File Validation**: Checks file existence and format
- **Error Messages**: Clear, actionable error messages for users
- **Edge Case Handling**: Graceful handling of boundary conditions

### Common Error Scenarios

- Invalid JSON format
- Missing required fields
- Invalid discount combinations
- File not found
- Schema validation failures

## Performance Considerations

- **Time Complexity**: O(n) where n is the number of cart items
- **Space Complexity**: O(1) additional space beyond input
- **Memory Usage**: Minimal memory footprint with efficient calculations
- **Scalability**: Designed to handle large cart sizes efficiently

## Development

### Code Style

- TypeScript with strict type checking
- Functional programming principles
- Comprehensive error handling
- Clear separation of concerns

### Adding New Campaign Types

1. Update the schema definitions in `schema.ts`
2. Implement calculation logic in `discount.ts`
3. Add comprehensive tests in `discount.test.ts`
4. Update documentation

## Assumptions

Based on the assignment requirements, the following assumptions were made:

1. **Currency**: All prices are in Thai Baht (THB)
2. **Precision**: Calculations are rounded to 2 decimal places
3. **Points System**: 1 point equals 1 THB in discount value
4. **Category Enforcement**: Items must belong to predefined categories
5. **Non-negative Prices**: All item prices must be non-negative
6. **Quantity Defaults**: Item quantity defaults to 1 if not specified
7. **Campaign Exclusivity**: Only one campaign per category can be applied
8. **Sequential Processing**: Discounts are applied in the specified order
9. **Seasonal Thresholds**: Seasonal discounts use floor division for threshold calculation
10. **Points Cap**: Points discount is always capped at 20% of current total


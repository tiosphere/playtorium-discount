import { CartSchema, type DiscountResult, type Cart } from "./schema"
import { calculateDiscount } from "./discount"
import { existsSync } from "fs"
import { ZodError } from "zod";

interface CLIError extends Error {
    code?: string;
}

function formatCurrency(amount: number): string {
    return `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`
}

function formatBill(cart: Cart, result: DiscountResult): void {
    const items = cart.items
    const discounts = cart.discounts

    // Header
    console.log()
    console.log(" ".repeat(28) + "RECEIPT SUMMARY" + " ".repeat(29))
    console.log("─".repeat(80))

    // Items section
    console.log(" ITEMS" + " ".repeat(72) + "")
    console.log("─".repeat(80))

    items.forEach((item, index) => {
        const quantity = item.quantity || 1
        const itemTotal = item.price * quantity
        const itemLine = `${index + 1}. ${item.name} (${item.category})`
        const priceLine = `${formatCurrency(item.price)} × ${quantity} = ${formatCurrency(itemTotal)}`

        console.log(` ${itemLine.padEnd(36)} ${priceLine.padStart(40)} `)
    })

    console.log("─".repeat(80))
    console.log(` SUBTOTAL${" ".repeat(44)}${formatCurrency(result.originalTotal).padStart(24)} `)

    // Discounts section (only show if there are discounts)
    if (discounts.length > 0 && result.totalDiscount > 0) {
        console.log("─".repeat(80))
        console.log(" DISCOUNTS APPLIED" + " ".repeat(60) + "")
        console.log("─".repeat(80))

        // Show campaign details
        discounts.forEach((campaign, index) => {
            let campaignDesc = ""
            switch (campaign.category) {
                case 'Coupon':
                    if (campaign.type === 'Fixed') {
                        campaignDesc = `Fixed Amount Coupon (${formatCurrency(campaign.amount)})`
                    } else if (campaign.type === 'Percentage') {
                        campaignDesc = `Percentage Coupon (${campaign.percentage}%)`
                    }
                    break
                case 'On Top':
                    if (campaign.type === 'Percentage') {
                        campaignDesc = `Category Discount (${campaign.targetCategory} ${campaign.percentage}%)`
                    } else if (campaign.type === 'Fixed') {
                        campaignDesc = `Points Discount (${campaign.customerPoints} points)`
                    }
                    break
                case 'Seasonal':
                    if (campaign.type === 'Special') {
                        campaignDesc = `Seasonal (${formatCurrency(campaign.discountYThb)} per ${formatCurrency(campaign.everyXThb)})`
                    }
                    break
            }

            const appliedCampaign = result.appliedCampaigns.find(c => c.category === campaign.category)
            const discountAmount = appliedCampaign ? appliedCampaign.discountAmount : 0

            if (discountAmount > 0) {
                console.log(` ${(index + 1) + ". " + campaignDesc.padEnd(50)} ${formatCurrency(discountAmount).padStart(24)} `)
            } else {
                console.log(` ${(index + 1) + ". " + campaignDesc.padEnd(50)} ${("No discount").padStart(24)} `)
            }
        })

        console.log("─".repeat(80))
        console.log(` TOTAL DISCOUNT${" ".repeat(38)}${formatCurrency(result.totalDiscount).padStart(24)} `)
    }

    // Final total
    console.log("─".repeat(80))
    console.log(` FINAL PAYMENT${" ".repeat(38)}${formatCurrency(result.finalTotal).padStart(25)} `)

    // Savings summary (if applicable)
    if (result.totalDiscount > 0) {
        const savingsPercent = (result.totalDiscount / result.originalTotal * 100).toFixed(1)
        console.log("─".repeat(80))
        console.log(` YOU SAVED ${savingsPercent}%${" ".repeat(38)}${formatCurrency(result.totalDiscount).padStart(25)} `)
    }

    console.log("─".repeat(80))
}

function showHelp(): void {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                           DISCOUNT CALCULATOR CLI                              ║
╚════════════════════════════════════════════════════════════════════════════════╝

USAGE:
  bun run index.ts <input-file.json>
  bun run index.ts --help

ARGUMENTS:
  input-file.json    Path to JSON file containing cart items and discount campaigns

OPTIONS:
  --help, -h        Show this help message

EXAMPLE JSON FORMAT:
{
  "items": [
    {
      "name": "T-Shirt",
      "price": 350,
      "category": "Clothing",
      "quantity": 2
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
      "type": "Fixed",
      "amount": 100
    },
    {
      "category": "On Top", 
      "type": "Percentage",
      "targetCategory": "Clothing",
      "percentage": 15
    }
  ]
}

SUPPORTED CATEGORIES:
  • Clothing
  • Accessories  
  • Electronics

DISCOUNT CAMPAIGN TYPES:
  
  COUPON (Choose one):
  • Fixed Amount: { "category": "Coupon", "type": "Fixed", "amount": 50 }
  • Percentage: { "category": "Coupon", "type": "Percentage", "percentage": 10 }
  
  ON TOP (Choose one):
  • Category Discount: { "category": "On Top", "type": "Percentage", "targetCategory": "Clothing", "percentage": 15 }
  • Points Discount: { "category": "On Top", "type": "Fixed", "customerPoints": 68 }
  
  SEASONAL (Choose one):
  • Special: { "category": "Seasonal", "type": "Special", "everyXThb": 300, "discountYThb": 40 }

RULES:
  • Only one campaign per category allowed
  • Application order: Coupon → On Top → Seasonal
  • Points discount capped at 20% of total
  • Final total cannot be negative
`)
}

function validateFile(filepath: string): void {
    if (!filepath.endsWith(".json")) {
        const error: CLIError = new Error("File must have .json extension")
        error.code = "INVALID_EXTENSION"
        throw error
    }

    if (!existsSync(filepath)) {
        const error: CLIError = new Error(`File not found: ${filepath}`)
        error.code = "FILE_NOT_FOUND"
        throw error
    }
}

async function loadAndValidateCart(filepath: string): Promise<Cart> {
    try {
        const file = Bun.file(filepath)
        const jsonData = await file.json()
        return CartSchema.parse(jsonData)
    } catch (error) {
        if (error instanceof ZodError) {
            if (error.issues) {
                const validationError: CLIError = new Error("Invalid cart data format")
                validationError.code = "VALIDATION_ERROR"

                console.error("❌ Validation errors found:")
                error.issues.forEach((issue: any) => {
                    const path = issue.path.length > 0 ? issue.path.join(".") : "root"
                    console.error(`   • ${path}: ${issue.message}`)
                })
                throw validationError
            }
        }
        throw error
    }

    // try {
    //     const file = Bun.file(filepath)
    //     const jsonData = await file.json()
    //     return CartSchema.parse(jsonData)
    // } catch (error) {
    //     if (error.name === "SyntaxError") {
    //         const cliError: CLIError = new Error(`Invalid JSON format in file: ${filepath}`)
    //         cliError.code = "INVALID_JSON"
    //         throw cliError
    //     }

    //     throw error
    // }
}

function handleError(error: CLIError): void {
    switch (error.code) {
        case "NO_FILE_PROVIDED":
            console.error("❌ Error: No input file provided")
            console.error("💡 Usage: bun run index.ts <input-file.json>")
            console.error("💡 For help: bun run index.ts --help")
            break
        case "INVALID_EXTENSION":
            console.error(`❌ Error: ${error.message}`)
            console.error("💡 Please provide a .json file")
            break
        case "FILE_NOT_FOUND":
            console.error(`❌ Error: ${error.message}`)
            console.error("💡 Please check the file path and try again")
            break
        case "INVALID_JSON":
            console.error(`❌ Error: ${error.message}`)
            console.error("💡 Please check your JSON syntax")
            break
        case "VALIDATION_ERROR":
            console.error(`❌ Error: ${error.message}`)
            console.error("💡 Please fix the data format issues above")
            break
        default:
            console.error(`❌ Unexpected error: ${error.message}`)
            break
    }
}

async function main(): Promise<void> {
    try {
        const args = process.argv.slice(2)

        // Handle help
        if (args.includes("--help") || args.includes("-h") || args.length === 0) {
            showHelp()
            return
        }

        // Get file path
        const filepath = args[0]
        if (!filepath) {
            const error: CLIError = new Error("No input file provided")
            error.code = "NO_FILE_PROVIDED"
            throw error
        }

        console.log(`🔍 Loading cart data from: ${filepath}`)

        // Validate and load file
        validateFile(filepath)
        const cart = await loadAndValidateCart(filepath)

        console.log("✅ Cart data loaded and validated successfully\n")

        // Calculate discounts
        const result = calculateDiscount(cart.items, cart.discounts)

        // Display results
        formatBill(cart, result)

        console.log("\n🎉 Discount calculation completed successfully!")

    } catch (error) {
        handleError(error as CLIError)
        process.exit(1)
    }
}

await main()
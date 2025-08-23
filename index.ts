import { CartSchema } from "./schema"
import { calculateDiscount } from "./discount"

async function main() {
    const filepath = process.argv.slice(2).at(0)
    if (!filepath || !filepath.endsWith(".json")) {
        throw Error("Expect json file path")
    }
    const cart = CartSchema.parse(await Bun.file(filepath).json())
    const result = calculateDiscount(cart.items, cart.discounts)
    console.log(result)
}

await main()
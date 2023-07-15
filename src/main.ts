// Give Chris the best I got.
import { kestrelHistory } from "./KestrelHistory";
import { kestrelOrders } from "./KestrelOrders";
//import { tristanHistory } from "./TristanHistory";
//import { tristanOrders } from "./TristanOrders";

interface IMarketOrder {
    duration: number;
    is_buy_order: boolean;
    issued: string;
    location_id: number;
    min_volume: number;
    order_id: number;
    price: number;
    range: string;
    system_id: number;
    type_id: number;
    volume_remain: number;
    volume_total: number;
}

interface IMarketHistoryEntry {
    average: number;
    date: string;
    highest: number;
    lowest: number;
    order_count: number;
    volume: number;
}
interface IMinMaxValue {
    highBuy: number,
    lowSell: number,
}
function minmax(orders: IMarketOrder[]): IMinMaxValue {
    const result: IMinMaxValue = { highBuy: 0, lowSell: Number.MAX_SAFE_INTEGER }
    for (const order of orders) {
        if (order.is_buy_order && order.price >= result.highBuy) {
            result.highBuy = order.price
        }
        if (!order.is_buy_order && order.price <= result.lowSell) {
            result.lowSell = order.price
        }
    }
    return result;
}
interface IAverageValues {
    averageOfVolume: number,
    averageOfHigh: number,
    averageOfLow: number,
    averageOfAverage: number,
}
function averageFinder(histories: IMarketHistoryEntry[]): IAverageValues {
    const result: IAverageValues = { averageOfVolume: 0, averageOfHigh: 0, averageOfLow: 0, averageOfAverage: 0 }
    for (const history of histories) {
        result.averageOfVolume += history.volume
        result.averageOfHigh += history.highest
        result.averageOfLow += history.lowest
        result.averageOfAverage += history.average
    }
    result.averageOfVolume /= histories.length
    result.averageOfHigh /= histories.length
    result.averageOfLow /= histories.length
    result.averageOfAverage /= histories.length
    return result;
}

// solve market signifier ()

function marketIndex(AV: IAverageValues): number {
    return (AV.averageOfHigh - AV.averageOfAverage) / (AV.averageOfHigh - AV.averageOfLow);
}

function MarketpassThrough(marketSignifier: number): number {
    return averageOutput.averageOfVolume * (2 * Math.min(marketSignifier, 1 - marketSignifier));
}
//TODO: remove statistical outliers
//TODO: delimiter for stations.
function rawMargin(orders: IMarketOrder[]): number {
    let sellAccumulator = 0;
    let buyAccumulator = 0;
    let sellOrders = 0;
    let buyOrders = 0;
    for (const order of orders) {
        if (order.is_buy_order) {
            buyAccumulator += order.price;
            buyOrders++;
        } else {
            sellAccumulator += order.price;
            sellOrders++;
        }
    }
    const sellAverage = sellAccumulator / sellOrders;
    const buyAverage = buyAccumulator / buyOrders;
    return sellAverage - buyAverage;
}

const estimatedCapture = 0.10;

function capturedValue(marketValue: number, estimatedCapture: number): number {
    // TODO: Determine how to calculate the percentage of capturable market.
    return marketValue * estimatedCapture;
}


const currentOrder = kestrelOrders
const currentHistory = kestrelHistory
const averageOutput = averageFinder(currentHistory);
const marketSignifier = marketIndex(averageOutput);
const marginalOrders = minmax(currentOrder)
const marketPassThru = MarketpassThrough(marketSignifier);
const marginRaw = rawMargin(currentOrder);
const marketValue = rawMargin(currentOrder) * MarketpassThrough(marketSignifier);
const capturedUnits = averageOutput.averageOfVolume * estimatedCapture;
//HACK: fix costToMarket to use actual units instead of highestbuy
//HACK: the 2x is meant to account for stock fluctuations, but should be calculated (average plus 1 standard deviation). No longer implemented, but 
//      this should still be figured out.
const costToMarket = (estimatedCapture * averageOutput.averageOfVolume) * marginalOrders.highBuy;
const roi = 100 * (capturedValue(marketValue, estimatedCapture) / costToMarket);

console.log(`Average Output: 
Average Average ${averageOutput.averageOfAverage.toFixed(2)}, 
Average High ${averageOutput.averageOfHigh.toFixed(2)}, 
Average Low ${averageOutput.averageOfLow.toFixed(2)}, 
Average Volume ${averageOutput.averageOfVolume.toFixed(2)}, 
Market signifier ${marketSignifier.toFixed(2)},
Marginal Orders Buy: ${marginalOrders.highBuy}, Sell: ${marginalOrders.lowSell},
Market Pass Through ${marketPassThru.toFixed(2)},
Raw Margin ${marginRaw.toFixed(2)},
Market Value ${marketValue.toFixed(2)}, 
Captured Units ${capturedUnits.toFixed(2)},
Cost to Market ${costToMarket.toFixed(2)}, 
Return on Investment ${roi.toFixed(2)}%`)
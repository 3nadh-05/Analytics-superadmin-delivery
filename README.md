# Fleet Ops — Delivery Management

A Delivery Management dashboard with four sections: **Riders**, **Merchants**, **Payouts**, and the new
**Delivery Statistics**. A fleet coordinator enters each rider's orders, distance, overtime and attendance
manually for a day; the app turns that into KPI cards, a rider × merchant breakdown, auto-detected
exceptions (dormant merchants, long trips, no-shows, OT clusters, missing data), a payout preview, and
day-on-day / week-on-week comparisons.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- React Router (hash routing)
- No backend — data is persisted to `localStorage` behind a small repository layer
  (`src/features/delivery-management/data/store.ts`) so it's a drop-in swap for a real API later.

## Getting started

```bash
npm install
npm run dev
```

On first run the app seeds ~8 weeks of realistic demo data (attendance, orders, km, OT, merchant mix)
ending on today so Delivery Statistics and Comparison have something to show immediately. Use
**Enter today's data** in the top bar to add or edit a day by hand — saved entries immediately flow into
the statistics and comparison views.

## Structure

```
src/features/delivery-management/
  data/        types, date helpers, localStorage repository, seed generator, aggregation/exception logic
  components/  shared UI (KPI cards, bar charts, tables)
  pages/       DeliveryStatisticsPage, ComparisonPage, DataEntryPage, RidersPage, MerchantsPage, PayoutsPage
```

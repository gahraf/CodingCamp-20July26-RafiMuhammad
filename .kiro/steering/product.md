# Product: Expense & Budget Visualizer

A single-page personal finance tracker built as a mini project for RevoU Coding Camp (July 2026) by Rafi Muhammad.

## Core Features
- Add transactions with a name, amount (IDR), and category
- Delete individual transactions
- Set and clear a spending limit with an over-limit warning
- Sort transactions by newest, oldest, amount, or category
- Pie chart showing spending breakdown by category (Chart.js)
- Light/dark theme toggle with persistence
- All data persisted in `localStorage` — no backend, no sign-in

## Target Users
Individual users who want a lightweight, browser-based tool to track daily expenses in Indonesian Rupiah (IDR).

## Currency & Locale
All amounts are formatted as Indonesian Rupiah using the `id-ID` locale (e.g., `Rp 50.000`). Amounts are stored as integers (no decimals).

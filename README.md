# Cardmarket Invoice Generator (Electron)

This is an **Electron desktop application** that helps you quickly generate **PDF invoices** for your Cardmarket orders.  
It automatically formats order details, calculates VAT, and produces a professional invoice ready to save or send.

## Features

- Electron-based desktop app (cross-platform)  
- Create invoices for Cardmarket orders  
- Automatically formats **articles, quantities, prices, VAT, and totals**  
- Handles multi-page invoices with responsive tables  
- Generates PDF files with dynamic filenames  
- Optional shipping and differentiation for international orders  

## Usage

1. Launch the application (via `npm start` or packaged `.exe/.app`).  
2. Fill in order details: recipient, articles, prices, VAT, shipping, etc.  
3. Click **Generate Invoice**.  
4. Choose save location — PDF is created automatically.  

## Tech Stack

- **Frontend/GUI:** Electron  
- **PDF Generation:** PDFKit  
- **Language:** JavaScript / Node.js  

## Purpose

This tool simplifies invoice creation for Cardmarket sellers, ensuring **accurate VAT handling** and professional formatting while saving time.

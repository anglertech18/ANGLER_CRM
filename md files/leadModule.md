# Task: Update Lead Module Filter Section

## Objective

Enhance the Lead Module filter section to improve usability and support multi-selection functionality.

## Requirements

### 1. Reduce Company Field Size

* In the filter section of the Lead Module, decrease the width/size of the **Company** field.
* The reduced size should provide better alignment and allow more filter fields to be visible on the screen.

### 2. Do Not Hide Filters

* Currently, some filters are hidden based on screen size or layout constraints.
* Modify the filter section so that **all filter fields remain visible** to the user.
* Users should not need to expand or perform additional actions to access the filters.

### 3. Enable Multi-Select for Quadrant Filter

* Update the **Quadrant** filter to support selecting multiple values simultaneously.
* Example:

  * Users should be able to select **Q1** and **Q2** at the same time.
  * The system should display leads belonging to either of the selected quadrants.

### 4. Enable Multi-Select for Product Filter

* Update the **Product** filter to support multiple selections.
* Example:

  * Users should be able to select multiple products in a single filtering operation.
  * The result should display leads matching any of the selected products.

### 5. Enable Multi-Select for Owner Filter

* Update the **Owner** filter to support selecting multiple owners simultaneously.
* Example:

  * Users should be able to select **Owner A** and **Owner B** at the same time.
  * The system should display leads assigned to any of the selected owners.

## Filter Logic

* Multiple selections within the same filter category (Quadrant, Product, Owner) should use an **OR condition**.
* Different filter categories should be combined using an **AND condition**.

### Example

If the user selects:

* Quadrant: **Q1, Q2**
* Product: **Product A, Product B**
* Owner: **User 1, User 2**

The system should return leads that satisfy:

```
(Quadrant = Q1 OR Quadrant = Q2)
AND
(Product = Product A OR Product = Product B)
AND
(Owner = User 1 OR Owner = User 2)
```

## Expected Outcome

* Company field occupies less space in the filter section.
* All filters remain visible without being hidden.
* Quadrant filter supports multi-selection.
* Product filter supports multi-selection.
* Owner filter supports multi-selection.
* Filter results are displayed accurately based on the selected criteria.

## Expected Order Closure Date filter (added 2026-08-27)

* New filter in the Lead index filter bar: **Expected Closure** (multi-select
  duration dropdown — multiple presets can be picked and their windows are OR'd).
* Filters on `forecast_headers.expected_order_closure_date` (Section 9 of the Lead
  form). Only leads that carry a forecast with a closure date inside the selected
  window match; leads without a forecast are excluded when the filter is active.
* Duration presets: This Week, Next Week, This Month, Next Month, This Quarter,
  Next Quarter, and **Date Picker** (custom from/to range).
* The client resolves each selected preset (or the custom range) to an
  index-aligned `closureFrom`/`closureTo` pair sent to `GET /api/leads`; the backend
  builds one date-range condition per pair on the lead's `forecast_header` relation
  and OR's them together (`leadController.getLeads`).

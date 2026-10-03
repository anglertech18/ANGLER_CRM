# POA (Plans of Action) Module – Updated Product-Only Logic

## Product Selection Logic

The Product dropdown is populated from:

`GET /api/seal/poas/mapped-products`

### Rules by Role

| Role         | Products Shown                                                                           |
| ------------ | ---------------------------------------------------------------------------------------- |
| CEO          | All active products from Product Master                                                  |
| SalesManager | Products mapped to themselves and their direct subordinates through User Product Mapping |
| SalesPerson  | Only products mapped to themselves                                                       |

### Updated Rules

* Products are loaded only from the Product Master.
* Only user-mapped products should be displayed.
* No Service-based lookup or mapping should be performed.
* No UserServiceTarget lookup should be used.
* No service_department mapping should be used.
* EIT Services and IM Services are treated as normal Products because they exist in the Product Master.
* On page load, the first mapped product is automatically selected.
* Changing the Product resets the BDE filter and all row-level filters.

---

## Database Model Updates

### PlanOfAction

| Field              | Action                                                 |
| ------------------ | ------------------------------------------------------ |
| product_id         | Retain                                                 |
| service_department | Legacy field – remove from business logic and UI usage |

### Updated Rule

* All Product references should use product_id.
* service_department should not be used for filtering, reporting, validations, or UI display.
* New records should be created using product_id only.

---

## API Endpoint Updates

### Rename

#### Old

GET /seal/poas/mapped-product-services

#### New

GET /seal/poas/mapped-products

### Updated Response

```json
[
  {
    "id": 1,
    "name": "FMS"
  }
]
```

### Updated Rules

* Return only products mapped to the logged-in user.
* Data source should be Product Master.
* No Product/Service segregation logic.
* No Service lookup logic.

---

## POA Form Updates

### Product Handling

* Product should be inherited from the selected Product.
* Only mapped products should be available.
* No Service field should exist.
* No Service Department field should exist.

---

## Related Module Updates

### Enquiry Tracker

Update all references:

#### Old

mapped-product-services

#### New

mapped-products

### Rules

* Use Product Master only.
* Use User Product Mapping only.
* Remove Service-related logic completely.

---

## Application-Wide Changes

Remove all references to:

* Service
* Services
* Service Department
* UserServiceTarget
* Product/Service Selection
* Service Filters
* Service Reports
* Service Validations
* Service Workflows

### New Standard

* Product is the only business entity.
* EIT Services and IM Services are treated as Products from Product Master.
* All dropdowns, reports, dashboards, APIs, and validations should operate using Products only.
* Only products mapped to the logged-in user should be displayed throughout the application.
* User (BDE) should default to the logged-in user wherever applicable.

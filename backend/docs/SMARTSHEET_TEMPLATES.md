# Smartsheet Templates

This document provides template structures for each import type. Copy these structures to create your Smartsheet templates.

---

## Sessions Sheet Template

### Column Setup

| Column Name | Type | Format | Required | Description |
|-------------|------|--------|----------|-------------|
| Title | Text/Number | - | Yes | Session title |
| Description | Text/Number | - | No | Full description |
| Speaker Name | Text/Number | - | No | Presenter name(s) |
| Location | Text/Number | - | No | Room or venue |
| Session Type | Dropdown | Workshop, Panel, Keynote, Demo | No | Session category |
| Start Time | Date | Date/Time | Yes | Session start |
| End Time | Date | Date/Time | Yes | Session end |
| Capacity | Text/Number | Number | No | Max attendees |

### Sample Data

```
Title                      | Start Time          | End Time            | Location | Speaker Name      | Session Type | Capacity
Opening Keynote           | 03/15/24 09:00     | 03/15/24 10:00     | Main Hall| Dr. Jane Smith    | Keynote     | 500
AI in Defense Workshop    | 03/15/24 10:30     | 03/15/24 12:00     | Room 101 | Prof. John Doe    | Workshop    | 50
Networking Lunch          | 03/15/24 12:00     | 03/15/24 13:00     | Cafeteria| -                 | Networking  | 200
Research Panel Discussion | 03/15/24 14:00     | 03/15/24 15:30     | Room 102 | Multiple Speakers | Panel       | 75
```

### Column Formulas (Optional)

**Duration (helper column):**
```
=([End Time]@row - [Start Time]@row) * 24
```

**Status (helper column):**
```
=IF([Start Time]@row > TODAY(), "Upcoming", IF([End Time]@row < TODAY(), "Completed", "In Progress"))
```

---

## Projects Sheet Template

### Column Setup

| Column Name | Type | Format | Required | Description |
|-------------|------|--------|----------|-------------|
| Project Title | Text/Number | - | Yes | Project name |
| Description | Text/Number | - | Yes | Project description |
| PI Name | Text/Number | - | Yes | Principal Investigator |
| PI Email | Text/Number | Email | Yes | PI's email address |
| Department | Text/Number | - | No | Academic department |
| Research Stage | Dropdown | concept, prototype, pilot_ready, deployed | No | Project maturity |
| Classification | Dropdown | Unclassified, Confidential, Secret | No | Security level |
| Keywords | Text/Number | - | No | Comma-separated tags |
| Research Areas | Text/Number | - | No | Focus areas |
| Seeking | Text/Number | - | No | What project needs |
| Students | Text/Number | - | No | Team member names |

### Sample Data

```
Project Title         | PI Name      | PI Email          | Description                    | Research Stage | Keywords              | Seeking
AI Logistics System   | Dr. Smith    | smith@navy.mil    | ML system for supply chain... | prototype      | AI, Logistics, ML     | Industry Partner, Funding
Quantum Sensors       | Prof. Jones  | jones@navy.mil    | Next-generation quantum...    | concept        | Quantum, Sensors      | Research Collaboration
Autonomous Drones     | Dr. Williams | williams@navy.mil | Swarm intelligence for...     | pilot_ready    | Drones, Autonomy, AI  | Field Testing Site
```

### Column Formulas (Optional)

**Status Indicator:**
```
=IF(OR([Research Stage]@row = "deployed", [Research Stage]@row = "pilot_ready"), "Ready", "Development")
```

**Team Size:**
```
=IF(ISBLANK(Students@row), 0, LEN(Students@row) - LEN(SUBSTITUTE(Students@row, ",", "")) + 1)
```

---

## Opportunities Sheet Template

### Column Setup

| Column Name | Type | Format | Required | Description |
|-------------|------|--------|----------|-------------|
| Title | Text/Number | - | Yes | Opportunity name |
| Description | Text/Number | - | No | Full details |
| Organization | Text/Number | - | No | Sponsor organization |
| Type | Dropdown | funding, internship, competition | No | Opportunity category |
| Deadline | Date | Date | No | Application deadline |
| Contact Email | Text/Number | Email | No | Contact person |
| Requirements | Text/Number | - | No | Eligibility criteria |
| Benefits | Text/Number | - | No | What's offered |
| Location | Text/Number | - | No | Physical location |
| Duration | Text/Number | - | No | Time commitment |
| DoD Alignment | Text/Number | - | No | Priority areas |

### Sample Data

```
Title                  | Type        | Organization | Deadline    | Description                      | Benefits         | Duration
SBIR Phase I Grant     | funding     | Navy         | 06/30/24   | Small business innovation...     | $150K funding    | 6 months
Summer Research Intern | internship  | NRL          | 03/15/24   | Undergraduate research...        | $6K stipend      | 10 weeks
Innovation Challenge   | competition | DARPA        | 05/01/24   | Pitch your defense tech idea...  | $50K prize       | 1 day event
Postdoc Fellowship     | funding     | ONR          | 04/15/24   | Two-year postdoctoral...         | $85K/year salary | 2 years
```

### Column Formulas (Optional)

**Days Until Deadline:**
```
=IF(ISBLANK(Deadline@row), "", Deadline@row - TODAY())
```

**Status:**
```
=IF(ISBLANK(Deadline@row), "Open", IF(Deadline@row < TODAY(), "Closed", "Open"))
```

---

## Partners Sheet Template

### Column Setup

| Column Name | Type | Format | Required | Description |
|-------------|------|--------|----------|-------------|
| Company Name | Text/Number | - | Yes | Organization name |
| Description | Text/Number | - | No | Company overview |
| Organization Type | Dropdown | Small Business, Large Corp, Startup, Government | No | Org category |
| Website | Text/Number | URL | No | Company website |
| Technology Focus | Text/Number | - | No | Tech areas (comma-sep) |
| Seeking Collaboration | Text/Number | - | No | What they're seeking |
| Booth Location | Text/Number | - | No | Exhibition booth # |
| Contact Name | Text/Number | - | No | Primary contact |
| Contact Title | Text/Number | - | No | Contact's role |
| Contact Email | Text/Number | Email | No | Contact email |
| Contact Phone | Text/Number | - | No | Phone number |
| DoD Sponsors | Text/Number | - | No | Gov relationships |

### Sample Data

```
Company Name       | Organization Type | Technology Focus        | Booth Location | Contact Name  | Contact Email        | Website
Acme Defense       | Large Corp       | AI, Cybersecurity       | Booth 101      | John Doe      | john@acme.com       | acme.com
TechStart Inc      | Startup          | Robotics, IoT          | Booth 102      | Jane Smith    | jane@techstart.io   | techstart.io
Defense Solutions  | Small Business   | Sensors, Electronics    | Booth 103      | Bob Johnson   | bob@defsol.com      | defsolutions.com
```

### Column Formulas (Optional)

**Tech Count:**
```
=IF(ISBLANK([Technology Focus]@row), 0, LEN([Technology Focus]@row) - LEN(SUBSTITUTE([Technology Focus]@row, ",", "")) + 1)
```

**Has Contact:**
```
=IF(OR(ISBLANK([Contact Email]@row), ISBLANK([Contact Phone]@row)), "Incomplete", "Complete")
```

---

## Attendees Sheet Template

### Column Setup

| Column Name | Type | Format | Required | Description |
|-------------|------|--------|----------|-------------|
| Full Name | Text/Number | - | Yes | Attendee name |
| Email | Text/Number | Email | Yes | Email address (unique) |
| Phone | Text/Number | - | No | Phone number |
| Rank | Text/Number | - | No | Military rank |
| Organization | Text/Number | - | No | Company/agency |
| Department | Text/Number | - | No | Department/division |
| Role | Text/Number | - | No | Job title |
| LinkedIn | Text/Number | URL | No | LinkedIn profile |
| Website | Text/Number | URL | No | Personal/org site |

### Sample Data

```
Full Name        | Email                | Organization    | Role              | Phone      | LinkedIn
John Doe         | john.doe@navy.mil    | US Navy        | Program Manager   | 555-0100  | linkedin.com/in/johndoe
Jane Smith       | jane@defense.gov     | DoD            | Research Analyst  | 555-0101  | linkedin.com/in/janesmith
Robert Johnson   | rjohnson@contractor  | SAIC           | Systems Engineer  | 555-0102  | linkedin.com/in/robertj
Mary Williams    | mary.w@university.edu| MIT            | PhD Student       | 555-0103  | linkedin.com/in/maryw
```

### Column Formulas (Optional)

**Email Domain:**
```
=RIGHT(Email@row, LEN(Email@row) - FIND("@", Email@row))
```

**Organization Type:**
```
=IF(OR(FIND(".mil", Email@row) > 0, FIND(".gov", Email@row) > 0), "Government", IF(FIND(".edu", Email@row) > 0, "Academic", "Private"))
```

---

## Best Practices for Sheet Creation

### 1. Data Validation

Add dropdown lists for consistent data:

**Session Type:**
- Keynote
- Panel
- Workshop
- Demo
- Networking

**Research Stage:**
- concept
- prototype
- pilot_ready
- deployed

**Opportunity Type:**
- funding
- internship
- competition

**Organization Type:**
- Small Business
- Large Corp
- Startup
- Government
- Academic
- Non-Profit

### 2. Conditional Formatting

**Highlight missing required fields:**
- If Email is blank → Red background
- If Title is blank → Red background
- If dates are invalid → Yellow background

**Color-code status:**
- Upcoming sessions → Green
- Past sessions → Gray
- Active opportunities → Blue
- Closed opportunities → Red

### 3. Helper Columns

Add these columns (they won't be imported):

- **Import Status** - Track which rows have been imported
- **Last Updated** - When row was last modified
- **Notes** - Internal notes about the record
- **Validation** - Formula to check if row is ready to import

### 4. Sheet Protection

1. Lock the header row to prevent column name changes
2. Lock ID columns if you're tracking Smartsheet row IDs
3. Use permissions to control who can edit data

### 5. Data Quality Checks

**Email validation formula:**
```
=IF(ISBLANK(Email@row), "Missing", IF(FIND("@", Email@row) > 0, "Valid", "Invalid"))
```

**Date validation:**
```
=IF(OR(ISBLANK([Start Time]@row), ISBLANK([End Time]@row)), "Missing", IF([End Time]@row > [Start Time]@row, "Valid", "Invalid"))
```

**Required fields check:**
```
=IF(AND(NOT(ISBLANK(Title@row)), NOT(ISBLANK(Email@row))), "Ready", "Missing Required")
```

---

## Import Checklist

Before running an import, verify:

- [ ] All required columns are present
- [ ] Column names match exactly (or use accepted alternatives)
- [ ] Required fields have values
- [ ] Emails are valid format
- [ ] Dates are valid and in correct format
- [ ] No duplicate records (based on unique fields)
- [ ] Test data is removed
- [ ] Data is finalized (not in draft state)

---

## Smartsheet Features to Use

### 1. Forms
Create forms for easy data entry:
- Partner registration form
- Attendee registration form
- Session proposal form

### 2. Reports
Create reports to:
- View only incomplete records
- Filter by date range
- Group by category

### 3. Dashboards
Build dashboards to visualize:
- Import status metrics
- Data quality scores
- Record counts by type

### 4. Automations
Set up automations to:
- Send alerts when new rows are added
- Notify when required fields are missing
- Update status columns automatically

### 5. Cell Links
Link related data across sheets:
- Link PI names from Projects to Attendees
- Link Organization names from Partners to Opportunities

---

## Exporting from Other Systems

### From Excel/CSV

1. Open your Excel file
2. **File** → **Save As**
3. Choose **CSV (Comma delimited)**
4. In Smartsheet: **File** → **Import** → **CSV**
5. Map columns to template

### From Google Sheets

1. In Google Sheets: **File** → **Download** → **CSV**
2. In Smartsheet: **File** → **Import** → **CSV**
3. Or use Smartsheet's Google Sheets connector

### From Database

Export query results to CSV with exact column names:

```sql
-- Example: Export sessions
SELECT
  title AS "Title",
  description AS "Description",
  speaker AS "Speaker Name",
  location AS "Location",
  session_type AS "Session Type",
  start_time AS "Start Time",
  end_time AS "End Time",
  capacity AS "Capacity"
FROM sessions
ORDER BY start_time;
```

---

## Template Files

Download ready-to-use templates:

- [Sessions Template](link-to-template)
- [Projects Template](link-to-template)
- [Opportunities Template](link-to-template)
- [Partners Template](link-to-template)
- [Attendees Template](link-to-template)

*Note: Create these templates in Smartsheet and share them with your team.*

---

## Need Help?

- See [SMARTSHEET_INTEGRATION.md](./SMARTSHEET_INTEGRATION.md) for detailed documentation
- See [SMARTSHEET_QUICK_START.md](./SMARTSHEET_QUICK_START.md) for setup instructions
- Contact your admin for Smartsheet access

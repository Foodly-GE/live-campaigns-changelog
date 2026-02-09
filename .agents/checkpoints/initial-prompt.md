### implementation
#### context
i have daily campaign data snapshots scheduled to the google drive dump. i want to process this snapshot data and build some features on top of it. the 2 core features in the todos are "changelog" feature, and the "calendar" feature.

in short, "changelog" feature will help us reflect on the day-to-day diffs in the campaign availability, while the "calendar" feature will help us observe the trend of provides with a discount and allow us to plan ahead. 

detailed description of each feature is provided below under feat: changelog and feat: calendar.

note: to view the timelapse of how would the feature work in real world, i have collected few of the daily snapshot csv files under simulation-data/ folder. we can simulate each daily run and fine tune the implementation.

as for the dataset itself, we will be using the below fields off of the snapshot csv files
- campaign id = `Campaign ID` from the file
- campaign start = `Smart Promo Offer Provider Enrollment Start Ts Utc Time`
- campaign end = `Smart Promo Offer Provider Enrollment End Ts Utc Time`
- campaign state = `Smart Promo Offer Mode`
- rest of the fields used in the explanation here share the exact naming but differ in formatting — e.g., when I mention campaign spend objective i mean `Campaign Spend Objective`,  discount type for `Discount Type`, etc.
#### feat: changelog
##### backend
###### tracking campaigns

to identify a single unit of unique campaign in the scope of this project, we should assign a **campaign-hash** to each record (row) in the snapshot file. **campaign-hash** is a combination of a `provider x discount-type x bonus data percentage x spend objective`. we will be needing a hashing policy, which will help us generate short, unique, reproducible keys of alphanumeric symbols. 

each day we run a cron job which takes a snapshot of the campaign information in our system, compares it to the previous days snapshot and captures occurrences of 3 events - `campaign-start`, `campaign-update`, `campaign-end`. 

1. `campaign-start` occurs when **campaign-hash** is present in the current day's snapshot and is missing from the previous days snapshot
2. `campaign-update` occurs when **campaign-hash** is present in both current days and previous days snapshots but below values change for campaign attributes.
	1. min basket size
	2. campaign id
	3. cost share percentage
	4. bonus data max value
	5. campaign start
	6. campaign end
3. `campaign-end` occurs when **campaign-hash** that was present in the previous days snapshot is missing from the current days snapshot.
###### banner actions
- `banner-start`: a new banner is needed for every occurrence of the `campaign-start` event in changelog
- `banner-update` banner needs to be modified for every occurrence of the `campaign-update` event, when modified fields are one of \["min basket size", "campaign id", "campaign end"].
	- some campaigns might be scheduled for scheduled for future (when compared to the system's date/today). in such cases, changing value of "campaign start" field can also trigger the then banner modification.
- `banner-end`: banner needs to be taken down for every `campaign-end` occurrence

daily "changelog" runs will generate the below table
- event type
- campaign-hash
- provider id
- discount type
- bonus data percentage
- spend objective
- banner action
- joined (provider details)
	- provider name 
- joined (campaign details)
	- campaign start
	- campaign end 
	- min basket size 
	- campaign id
	- cost share percentage
	- bonus data max value
##### frontend
- summary: # daily occurrences per each changelog event type (`campaign-start`, `campaign-update` , `campaign-end`) overlayed on the time series
- changelog details grouped by changelog event type
#### feat: calendar
###### backend
identify below campaigns by comparing their start/end dates and state (smart promo offer enrollment state) to the system's current date
- live campaign 
- scheduled campaign
- finished campaign
###### frontend
filter results by
- provider details
- campaign details

serve the filtered results 
- summary: # providers with at least 1 campaign, overlayed on the time series. 3 traces indicating campaign availability status — finished, live, scheduled.
- detailed: details for every campaign grouped by campaign availability status
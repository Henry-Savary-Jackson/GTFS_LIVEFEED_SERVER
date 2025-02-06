
# Testing

## Testing feed actions
- [] test viewing a feed 
- [] test adding correct tripUpdate
    - [] skipping a stop
    - [] delaying a stop
    - [] cancelling a trip
- [] test adding correct ServiceAlert
    - [] correct Route in entityselector
    - [] correct Stop in entityselector
    - [] both correct Route and Stop in entityselector
    - [] trip in entityselector 
- [] test adding incorrect tripUpdate
    - [] trip doesnt exist
    - [] invalid StopTimeUpdate
    - [] no stop time update and not cancelled 
- [] test adding incoreect service alert
    - [] invalid Route in entityselector
    - [] invlalid Stop in entityselector
    - [] invalid correct Route and Stop in entityselector
    - [] invalid trip in entityselector 
- [] test deleting a feedEntity
- [] test a malformed deleting feedEntity

## Testing authentication

- [] test correct authentication as admin
- [] test incorrect authentication
    - [] test no such user
    - [] test wrong password
    - [] test malformed authentication attempt

## Testing GTFS validator

- [] test correct excel file
- [] test incorrect excel
    - [] missing sheet
    - [] duplicate stoptimes
    - [] duplicate trips
    - [] invalid table formats
    - [] invalid headsigns
    - [] invalid Directory
    - [] invalid stops

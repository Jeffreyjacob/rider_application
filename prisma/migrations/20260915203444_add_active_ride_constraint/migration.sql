CREATE UNIQUE INDEX "one_active_ride_per_driver"
ON "Ride" ("driverId")
WHERE "status" IN ('ACCEPTED', 'IN_PROGRESS');
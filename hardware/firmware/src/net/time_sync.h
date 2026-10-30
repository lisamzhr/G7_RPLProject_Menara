#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#else
#include <cstddef>
#include <cstdio>
#endif
#include <time.h>

class TimeSync {
public:
    TimeSync(const char* ntpServer = "pool.ntp.org", long gmtOffsetSec = 25200, int daylightOffsetSec = 0);
    bool begin();
    bool getISO8601Timestamp(char* buffer, size_t maxLen);
    bool isSynchronized();

private:
    const char* _ntpServer;
    long _gmtOffsetSec;
    int _daylightOffsetSec;
    bool _synced;
};

#include "time_sync.h"

TimeSync::TimeSync(const char* ntpServer, long gmtOffsetSec, int daylightOffsetSec)
    : _ntpServer(ntpServer), _gmtOffsetSec(gmtOffsetSec), _daylightOffsetSec(daylightOffsetSec), _synced(false) {}

bool TimeSync::begin() {
    configTime(_gmtOffsetSec, _daylightOffsetSec, _ntpServer);
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 5000)) {
        _synced = true;
        return true;
    }
    return false;
}

bool TimeSync::getISO8601Timestamp(char* buffer, size_t maxLen) {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo, 100)) {
        // Fallback placeholder if NTP sync failed
        snprintf(buffer, maxLen, "1970-01-01T00:00:00Z");
        return false;
    }
    strftime(buffer, maxLen, "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    return true;
}

bool TimeSync::isSynchronized() {
    return _synced;
}

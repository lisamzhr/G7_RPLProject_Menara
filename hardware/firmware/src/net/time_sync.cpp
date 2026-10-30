#include "time_sync.h"

TimeSync::TimeSync(const char* ntpServer, long gmtOffsetSec, int daylightOffsetSec)
    : _ntpServer(ntpServer), _gmtOffsetSec(gmtOffsetSec), _daylightOffsetSec(daylightOffsetSec), _synced(false) {}

bool TimeSync::begin() {
#if defined(ARDUINO)
    configTime(_gmtOffsetSec, _daylightOffsetSec, _ntpServer);
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 5000)) {
        _synced = true;
        return true;
    }
    return false;
#else
    _synced = true;
    return true;
#endif
}

bool TimeSync::getISO8601Timestamp(char* buffer, size_t maxLen) {
#if defined(ARDUINO)
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo, 100)) {
        // Fallback placeholder if NTP sync failed
        snprintf(buffer, maxLen, "1970-01-01T00:00:00Z");
        return false;
    }
    strftime(buffer, maxLen, "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    return true;
#else
    time_t now = time(nullptr);
    struct tm* tm_utc = gmtime(&now);
    if (!tm_utc) {
        snprintf(buffer, maxLen, "1970-01-01T00:00:00Z");
        return false;
    }
    strftime(buffer, maxLen, "%Y-%m-%dT%H:%M:%SZ", tm_utc);
    return true;
#endif
}

bool TimeSync::isSynchronized() {
    return _synced;
}

#include "time_sync.h"

TimeSync::TimeSync(const char* ntpServer, long gmtOffsetSec, int daylightOffsetSec)
    : _ntpServer(ntpServer), _gmtOffsetSec(gmtOffsetSec), _daylightOffsetSec(daylightOffsetSec), _synced(false) {}

bool TimeSync::begin() {
#if defined(ARDUINO)
    // Configure NTP to UTC (offset 0) so timestamps ending in 'Z' represent true UTC
    configTime(0, 0, _ntpServer);
    time_t now = time(nullptr);
    if (now > 1700000000) {
        _synced = true;
        return true;
    }
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 5000)) {
        now = time(nullptr);
        if (now > 1700000000) {
            _synced = true;
            return true;
        }
    }
    return false;
#else
    _synced = true;
    return true;
#endif
}

bool TimeSync::getISO8601Timestamp(char* buffer, size_t maxLen) {
    if (!buffer || maxLen < 21) {
        if (buffer && maxLen > 0) buffer[0] = '\0';
        return false;
    }

#if defined(ARDUINO)
    time_t now = time(nullptr);
    if (now < 1700000000) {
        // Fallback: NTP has not synchronized yet.
        // Return empty string so backend can automatically assign server UTC time.
        buffer[0] = '\0';
        return false;
    }
    struct tm timeinfo;
    gmtime_r(&now, &timeinfo);
    strftime(buffer, maxLen, "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    return true;
#else
    time_t now = time(nullptr);
    struct tm tm_utc{};
#if defined(_WIN32)
    gmtime_s(&tm_utc, &now);
#else
    gmtime_r(&now, &tm_utc);
#endif
    strftime(buffer, maxLen, "%Y-%m-%dT%H:%M:%SZ", &tm_utc);
    return true;
#endif
}

bool TimeSync::isSynchronized() {
    return _synced;
}

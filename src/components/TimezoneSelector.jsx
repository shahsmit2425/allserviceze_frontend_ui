import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'UK Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Europe/Berlin', label: 'Berlin Time' },
  { value: 'Asia/Tokyo', label: 'Japan Time' },
  { value: 'Asia/Shanghai', label: 'China Time' },
  { value: 'Asia/Kolkata', label: 'India Time' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
  { value: 'UTC', label: 'UTC (Universal)' },
];

export default function TimezoneSelector({ value, onChange }) {
  // Auto-detect user's timezone
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Your Timezone
      </label>
      <Select value={value || detectedTz} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select timezone..." />
        </SelectTrigger>
        <SelectContent>
          {detectedTz && !TIMEZONES.find(tz => tz.value === detectedTz) && (
            <SelectItem value={detectedTz}>
              {detectedTz} (detected)
            </SelectItem>
          )}
          {TIMEZONES.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500">
        Detected: {detectedTz}
      </p>
    </div>
  );
}

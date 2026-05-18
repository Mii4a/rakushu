export type ServiceCalendarRecord = {
  serviceId: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
};

export type ServiceExceptionRecord = {
  serviceId: string;
  serviceDate: string;
  exceptionType: number;
};

function getWeekdayKey(date: string) {
  const normalized = date.trim();
  if (!/^\d{8}$/.test(normalized)) {
    return null;
  }

  const utcDate = new Date(Date.UTC(Number(normalized.slice(0, 4)), Number(normalized.slice(4, 6)) - 1, Number(normalized.slice(6, 8))));
  const day = utcDate.getUTCDay();
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][day] ?? null;
}

export function resolveActiveServiceIds(params: {
  services: ServiceCalendarRecord[];
  exceptions: ServiceExceptionRecord[];
  targetDate?: string;
}) {
  if (!params.targetDate) {
    return new Set(
      params.services
        .filter((service) => service.monday || service.tuesday || service.wednesday || service.thursday || service.friday)
        .map((service) => service.serviceId)
    );
  }

  const weekdayKey = getWeekdayKey(params.targetDate);
  const active = new Set(
    params.services
      .filter((service) => (weekdayKey ? Boolean(service[weekdayKey as keyof ServiceCalendarRecord]) : false))
      .map((service) => service.serviceId)
  );

  for (const exception of params.exceptions) {
    if (exception.serviceDate !== params.targetDate) {
      continue;
    }

    if (exception.exceptionType === 1) {
      active.add(exception.serviceId);
    } else if (exception.exceptionType === 2) {
      active.delete(exception.serviceId);
    }
  }

  return active;
}

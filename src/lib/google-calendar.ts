import { google } from "googleapis";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string or time like "09:00"
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
}

function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

export async function getCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient(accessToken);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    timeZone: "America/New_York",
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const events = response.data.items ?? [];

  return events.map((event) => {
    const allDay = !event.start?.dateTime;
    const start = event.start?.dateTime ?? event.start?.date ?? "";
    const end = event.end?.dateTime ?? event.end?.date ?? "";

    return {
      id: event.id ?? "",
      title: event.summary ?? "(No title)",
      start,
      end,
      allDay,
      location: event.location ?? undefined,
      description: event.description ?? undefined,
    };
  });
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    title: string;
    start: string; // ISO datetime or "YYYY-MM-DDTHH:mm:ss"
    end: string;
    description?: string;
    timeZone?: string;
  }
) {
  const calendar = getCalendarClient(accessToken);
  const tz = event.timeZone ?? "America/New_York";

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.start, timeZone: tz },
      end: { dateTime: event.end, timeZone: tz },
    },
  });

  return {
    id: response.data.id ?? "",
    title: response.data.summary ?? "",
    start: response.data.start?.dateTime ?? "",
    end: response.data.end?.dateTime ?? "",
    allDay: false,
  };
}

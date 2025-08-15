// src/components/Calendar/CalendarView.jsx

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

// <-- UPDATED: Use a standard import for the locale file
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US"; // <-- NEW: Import the locale using ES modules

import AppointmentContextMenu from "./AppointmentContextMenu";

// <-- UPDATED: Define the localizer with the imported locale object
const locales = {
  "en-US": enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

const EventContent = ({ event }) => {
  return (
    <div className="flex flex-col h-full text-xs p-1">
      <div className="font-bold">{event.clientName}</div>
      {event.notes && event.notes.trim() !== "" && (
        <span className="text-[10px] text-blue-500 font-semibold mt-auto">
          Notes
        </span>
      )}
    </div>
  );
};

const EventWrapper = ({ event, children, onContextMenu }) => {
  return <div onContextMenu={(e) => onContextMenu(e, event)}>{children}</div>;
};

function CalendarView({
  events,
  onSelectSlot,
  onSelectEvent,
  eventPropGetter,
  onEventResize,
  onEventDrop,
  onMarkDone,
  onMarkMissed,
  onMarkPostponed,
}) {
  const [view, setView] = useState("week");
  const [date, setDate] = useState(new Date());
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    appointmentId: null,
  });

  const handleContextMenu = (e, event) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      appointmentId: event.id,
    });
  };

  const handleCloseMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, appointmentId: null });
  };

  const selectedAppointment = events.find(
    (e) => e.id === contextMenu.appointmentId
  );

  return (
    <div className="h-[700px] my-5">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        className="w-full h-full"
        defaultView="week"
        selectable
        resizable
        onSelectSlot={onSelectSlot}
        onDoubleClickEvent={onSelectEvent}
        onSelectEvent={() => {}}
        eventPropGetter={eventPropGetter}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onEventResize={onEventResize}
        onEventDrop={onEventDrop}
        components={{
          event: EventContent,
          eventWrapper: (props) => (
            <EventWrapper {...props} onContextMenu={handleContextMenu} />
          ),
        }}
      />
      {contextMenu.visible && selectedAppointment && (
        <AppointmentContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isVisible={contextMenu.visible}
          appointment={selectedAppointment}
          onClose={handleCloseMenu}
          onEdit={() => {
            onSelectEvent(selectedAppointment);
            handleCloseMenu();
          }}
          onMarkDone={() => {
            onMarkDone(selectedAppointment.id);
            handleCloseMenu();
          }}
          onMarkMissed={() => {
            onMarkMissed(selectedAppointment.id);
            handleCloseMenu();
          }}
          onMarkPostponed={() => {
            onMarkPostponed(selectedAppointment.id);
            handleCloseMenu();
          }}
        />
      )}
    </div>
  );
}

export default CalendarView;

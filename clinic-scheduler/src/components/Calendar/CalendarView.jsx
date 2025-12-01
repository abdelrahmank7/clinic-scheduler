// src/components/Calendar/CalendarView.jsx

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import AppointmentContextMenu from "./AppointmentContextMenu";

const locales = { "en-US": enUS };
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

const EventWrapper = ({ event, children, onContextMenu, onDoubleClick }) => {
  return (
    <div
      onContextMenu={(e) => onContextMenu(e, event)}
      onDoubleClick={() => onDoubleClick(event)}
    >
      {children}
    </div>
  );
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
  onNavigate, // Prop for navigation event (date and view change)
  view, // Prop for current view (month, week, day)
  date, // Prop for current displayed date
  onView, // Prop for handling view change
  onDateChange, // Prop for handling date change
}) {
  // Remove local state for view and date, use props instead
  // const [view, setView] = useState("week");
  // const [date, setDate] = useState(new Date());

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
        defaultView="week" // Keep default view for initial render
        selectable
        resizable
        onSelectSlot={onSelectSlot}
        onDoubleClickEvent={() => {}}
        onSelectEvent={() => {}}
        eventPropGetter={eventPropGetter}
        // Use props for controlled view and date
        view={view}
        date={date}
        onView={onView}
        onNavigate={onNavigate} // Use the combined handler from DashboardPage
        onEventResize={onEventResize}
        onEventDrop={onEventDrop}
        components={{
          event: EventContent,
          eventWrapper: (props) => (
            <EventWrapper
              {...props}
              onContextMenu={handleContextMenu}
              onDoubleClick={onSelectEvent}
            />
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

// // src/components/Calendar/CalendarView.jsx

// import React, { useState } from "react";
// import { Calendar, dateFnsLocalizer } from "react-big-calendar";
// import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
// import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
// import { format, parse, startOfWeek, getDay } from "date-fns";
// import enUS from "date-fns/locale/en-US";
// import AppointmentContextMenu from "./AppointmentContextMenu";

// const locales = { "en-US": enUS };
// const localizer = dateFnsLocalizer({
//   format,
//   parse,
//   startOfWeek,
//   getDay,
//   locales,
// });

// const DnDCalendar = withDragAndDrop(Calendar);

// const EventContent = ({ event }) => {
//   return (
//     <div className="flex flex-col h-full text-xs p-1">
//       <div className="font-bold">{event.clientName}</div>
//       {event.notes && event.notes.trim() !== "" && (
//         <span className="text-[10px] text-blue-500 font-semibold mt-auto">
//           Notes
//         </span>
//       )}
//     </div>
//   );
// };

// const EventWrapper = ({ event, children, onContextMenu, onDoubleClick }) => {
//   return (
//     <div
//       onContextMenu={(e) => onContextMenu(e, event)}
//       onDoubleClick={() => onDoubleClick(event)}
//     >
//       {children}
//     </div>
//   );
// };

// function CalendarView({
//   events,
//   onSelectSlot,
//   onSelectEvent,
//   eventPropGetter,
//   onEventResize,
//   onEventDrop,
//   onMarkDone,
//   onMarkMissed,
//   onMarkPostponed,
// }) {
//   const [view, setView] = useState("week");
//   const [date, setDate] = useState(new Date());
//   const [contextMenu, setContextMenu] = useState({
//     visible: false,
//     x: 0,
//     y: 0,
//     appointmentId: null,
//   });

//   const handleContextMenu = (e, event) => {
//     e.preventDefault();
//     setContextMenu({
//       visible: true,
//       x: e.clientX,
//       y: e.clientY,
//       appointmentId: event.id,
//     });
//   };

//   const handleCloseMenu = () => {
//     setContextMenu({ visible: false, x: 0, y: 0, appointmentId: null });
//   };

//   const selectedAppointment = events.find(
//     (e) => e.id === contextMenu.appointmentId
//   );

//   return (
//     <div className="h-[700px] my-5">
//       <DnDCalendar
//         localizer={localizer}
//         events={events}
//         startAccessor="start"
//         endAccessor="end"
//         className="w-full h-full"
//         defaultView="week"
//         selectable
//         resizable
//         onSelectSlot={onSelectSlot}
//         onDoubleClickEvent={() => {}}
//         onSelectEvent={() => {}}
//         eventPropGetter={eventPropGetter}
//         view={view}
//         onView={setView}
//         date={date}
//         onNavigate={setDate}
//         onEventResize={onEventResize}
//         onEventDrop={onEventDrop}
//         components={{
//           event: EventContent,
//           eventWrapper: (props) => (
//             <EventWrapper
//               {...props}
//               onContextMenu={handleContextMenu}
//               onDoubleClick={onSelectEvent}
//             />
//           ),
//         }}
//       />
//       {contextMenu.visible && selectedAppointment && (
//         <AppointmentContextMenu
//           x={contextMenu.x}
//           y={contextMenu.y}
//           isVisible={contextMenu.visible}
//           appointment={selectedAppointment}
//           onClose={handleCloseMenu}
//           onEdit={() => {
//             onSelectEvent(selectedAppointment);
//             handleCloseMenu();
//           }}
//           onMarkDone={() => {
//             onMarkDone(selectedAppointment.id);
//             handleCloseMenu();
//           }}
//           onMarkMissed={() => {
//             onMarkMissed(selectedAppointment.id);
//             handleCloseMenu();
//           }}
//           onMarkPostponed={() => {
//             onMarkPostponed(selectedAppointment.id);
//             handleCloseMenu();
//           }}
//         />
//       )}
//     </div>
//   );
// }

// export default CalendarView;

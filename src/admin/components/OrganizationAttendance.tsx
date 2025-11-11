import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface OrganizationAttendanceProps {
  orgId: string;
}

interface AttendanceRow {
  user_id: string;
  user_name: string;
  rsvp: boolean;
  registration: boolean;
  evaluation: boolean;
  attended: boolean;
}

export default function OrganizationAttendance({ orgId }: OrganizationAttendanceProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState<{ [userId: string]: boolean }>({});

  // Fetch events for the organization
  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title')
        .eq('org_id', orgId)
        .eq('post_type', 'event');
      if (error) toast.error(error.message);
      else setEvents(data || []);
    };
    fetchEvents();
  }, [orgId]);

  // Fetch attendance data when event is selected
  const fetchAttendanceData = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      // Get org members
      const { data: members, error: membersError } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', orgId);
      if (membersError) throw membersError;

      const userIds = members.map(m => m.user_id);

      // Get user details
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds);
      if (usersError) throw usersError;

      // Get RSVPs, registrations, evaluations, attendance
      const [rsvpsRes, regsRes, evalsRes, attRes] = await Promise.all([
        supabase.from('rsvps').select('user_id').eq('post_id', selectedEventId),
        supabase.from('event_registrations').select('user_id').eq('post_id', selectedEventId),
        supabase.from('event_evaluations').select('user_id').eq('post_id', selectedEventId),
        supabase.from('event_attendance').select('user_id, attended').eq('post_id', selectedEventId),
      ]);

      const rsvpUsers = new Set(rsvpsRes.data?.map(r => r.user_id) || []);
      const regUsers = new Set(regsRes.data?.map(r => r.user_id) || []);
      const evalUsers = new Set(evalsRes.data?.map(r => r.user_id) || []);
      const attMap = new Map(attRes.data?.map(a => [a.user_id, a.attended]) || []);

      const data: AttendanceRow[] = users.map(user => ({
        user_id: user.id,
        user_name: `${user.first_name} ${user.last_name}`,
        rsvp: rsvpUsers.has(user.id),
        registration: regUsers.has(user.id),
        evaluation: evalUsers.has(user.id),
        attended: attMap.get(user.id) || false,
      }));

      setAttendanceData(data);
      setChanges({});
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedEventId, orgId]);

  const handleAttendanceChange = (userId: string, attended: boolean) => {
    setChanges(prev => ({ ...prev, [userId]: attended }));
  };

  const handleConfirmChanges = async () => {
    try {
      const updates = Object.entries(changes).map(([userId, attended]) => ({
        user_id: userId,
        post_id: selectedEventId,
        attended,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('event_attendance').upsert(updates);
      if (error) throw error;
      // Refresh data without full page reload
      await fetchAttendanceData();
      toast.success('Attendance updated successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Choose an event...</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>{event.title}</option>
          ))}
        </select>
      </div>

      {selectedEventId && (
        <>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Participant Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">RSVP</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Registration</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Evaluation</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attended</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceData.map(row => (
                    <tr key={row.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{row.user_name}</td>
                      <td className="px-4 py-2 text-sm text-center">{row.rsvp ? '✓' : '-'}</td>
                      <td className="px-4 py-2 text-sm text-center">{row.registration ? '✓' : '-'}</td>
                      <td className="px-4 py-2 text-sm text-center">{row.evaluation ? '✓' : '-'}</td>
                      <td className="px-4 py-2 text-sm text-center">
                        <input
                          type="checkbox"
                          checked={changes[row.user_id] !== undefined ? changes[row.user_id] : row.attended}
                          onChange={(e) => handleAttendanceChange(row.user_id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Object.keys(changes).length > 0 && (
            <div className="flex justify-end mt-4">
              <button
                onClick={handleConfirmChanges}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Confirm Changes
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
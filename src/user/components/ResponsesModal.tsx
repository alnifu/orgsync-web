import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import * as Dialog from "@radix-ui/react-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { X, Users, BarChart3, MessageSquare, Download, Star, UserCheck } from "lucide-react";
import type { Posts, EventEvaluation, EventRegistration } from '../../types/database.types';

interface ResponsesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Posts | null;
}

interface RSVP {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
}

interface PollVote {
  id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

interface FormResponse {
  id: string;
  user_id: string;
  responses: Record<string, unknown>;
  submitted_at: string;
}

export default function ResponsesModal({ open, onOpenChange, post }: ResponsesModalProps) {
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [formResponses, setFormResponses] = useState<FormResponse[]>([]);
  const [evaluations, setEvaluations] = useState<EventEvaluation[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rsvps' | 'evaluations' | 'registrations'>('rsvps');

  const fetchResponses = useCallback(async () => {
    if (!post) return;

    setLoading(true);
    try {
      if (post.post_type === 'event') {
        const [rsvpData, evaluationData, registrationData] = await Promise.all([
          supabase.from('rsvps').select('*').eq('post_id', post.id),
          supabase.from('event_evaluations').select('*').eq('post_id', post.id),
          supabase.from('event_registrations').select('*').eq('post_id', post.id)
        ]);
        
        setRsvps(rsvpData.data || []);
        setEvaluations(evaluationData.data || []);
        setRegistrations(registrationData.data || []);
      } else if (post.post_type === 'poll') {
        const { data } = await supabase
          .from('poll_votes')
          .select('*')
          .eq('post_id', post.id);
        setVotes(data || []);
      } else if (post.post_type === 'feedback') {
        const { data } = await supabase
          .from('form_responses')
          .select('*')
          .eq('post_id', post.id);
        setFormResponses(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [post]);

  useEffect(() => {
    if (open && post) {
      fetchResponses();
    }
  }, [open, post, fetchResponses]);

  function getPollOptions(): string[] {
    if (!post || post.post_type !== 'poll') return [];

    try {
      const content = JSON.parse(post.content);
      return content.options || [];
    } catch {
      return post.tags || [];
    }
  }

  function getFormFields(): Record<string, unknown>[] {
    if (!post || post.post_type !== 'feedback') return [];

    try {
      const content = JSON.parse(post.content);
      return content.fields || [];
    } catch {
      return [];
    }
  }

  function exportData() {
    if (!post) return;

    let data: Record<string, unknown>[] = [];
    let filename = '';

    if (post.post_type === 'event') {
      if (activeTab === 'rsvps') {
        data = rsvps.map(rsvp => ({
          user_id: rsvp.user_id,
          status: rsvp.status,
          created_at: rsvp.created_at
        }));
        filename = `event-rsvps-${post.id}.csv`;
      } else if (activeTab === 'evaluations') {
        data = evaluations.map(evaluation => ({
          user_id: evaluation.user_id,
          design_rating: evaluation.design,
          speakers_rating: evaluation.speakers,
          facilities_rating: evaluation.facilities,
          participation_rating: evaluation.participation,
          overall_rating: evaluation.overall,
          benefits: evaluation.benefits,
          problems: evaluation.problems,
          comments: evaluation.comments,
          created_at: evaluation.created_at
        }));
        filename = `event-evaluations-${post.id}.csv`;
      } else if (activeTab === 'registrations') {
        data = registrations.map(reg => ({
          user_id: reg.user_id,
          first_name: reg.first_name,
          middle_initial: reg.middle_initial,
          last_name: reg.last_name,
          email: reg.email,
          college: reg.college,
          program: reg.program,
          section: reg.section,
          created_at: reg.created_at
        }));
        filename = `event-registrations-${post.id}.csv`;
      }
    } else if (post.post_type === 'poll') {
      const options = getPollOptions();
      data = votes.map(vote => ({
        user_id: vote.user_id,
        option: options[vote.option_index] || `Option ${vote.option_index + 1}`,
        created_at: vote.created_at
      }));
      filename = `poll-results-${post.id}.csv`;
    } else if (post.post_type === 'feedback') {
      data = formResponses.map(response => ({
        user_id: response.user_id,
        ...Object.fromEntries(
          Object.entries(response.responses).map(([key, value]) => [key, String(value)])
        ),
        submitted_at: response.submitted_at
      }));
      filename = `form-responses-${post.id}.csv`;
    }

    // Simple CSV export
    if (data.length > 0) {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(','));
      const csv = [headers, ...rows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  if (!post) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {post.post_type === 'event' && <Users className="w-6 h-6 text-blue-600" />}
              {post.post_type === 'poll' && <BarChart3 className="w-6 h-6 text-purple-600" />}
              {post.post_type === 'feedback' && <MessageSquare className="w-6 h-6 text-orange-600" />}
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  {post.post_type === 'event' && 'Event Responses'}
                  {post.post_type === 'poll' && 'Poll Results'}
                  {post.post_type === 'feedback' && 'Form Responses'}
                </Dialog.Title>
                <p className="text-gray-600 text-sm mt-1">{post.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download size={16} />
                Export
              </button>
              <Dialog.Close asChild>
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading responses...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {post.post_type === 'event' && (
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'rsvps' | 'evaluations' | 'registrations')}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="rsvps" className="flex items-center gap-2">
                      <Users size={16} />
                      RSVPs ({rsvps.length})
                    </TabsTrigger>
                    <TabsTrigger value="evaluations" className="flex items-center gap-2">
                      <Star size={16} />
                      Evaluations ({evaluations.length})
                    </TabsTrigger>
                    <TabsTrigger value="registrations" className="flex items-center gap-2">
                      <UserCheck size={16} />
                      Registrations ({registrations.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="rsvps" className="space-y-4">
                   {/*} <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{rsvps.filter(r => r.status === 'attending').length}</div>
                        <div className="text-sm text-green-700">Attending</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{rsvps.filter(r => r.status === 'maybe').length}</div>
                        <div className="text-sm text-yellow-700">Maybe</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{rsvps.filter(r => r.status === 'not_attending').length}</div>
                        <div className="text-sm text-red-700">Not Attending</div>
                      </div>
                    </div> */}
                    <div className="space-y-2">
                      {rsvps.map((rsvp) => (
                        <div key={rsvp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">{rsvp.user_id.slice(0, 8)}...</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rsvp.status === 'attending' ? 'bg-green-100 text-green-800' :
                              rsvp.status === 'maybe' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {rsvp.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(rsvp.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                      {rsvps.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No RSVPs yet</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="evaluations" className="space-y-4">
                    {evaluations.length > 0 && (
                      <div className="grid grid-cols-5 gap-4 mb-6">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {(evaluations.reduce((sum, e) => sum + e.design, 0) / evaluations.length).toFixed(1)}
                          </div>
                          <div className="text-xs text-blue-700">Design</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {(evaluations.reduce((sum, e) => sum + e.speakers, 0) / evaluations.length).toFixed(1)}
                          </div>
                          <div className="text-xs text-green-700">Speakers</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">
                            {(evaluations.reduce((sum, e) => sum + e.facilities, 0) / evaluations.length).toFixed(1)}
                          </div>
                          <div className="text-xs text-purple-700">Facilities</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">
                            {(evaluations.reduce((sum, e) => sum + e.participation, 0) / evaluations.length).toFixed(1)}
                          </div>
                          <div className="text-xs text-orange-700">Participation</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-lg font-bold text-red-600">
                            {(evaluations.reduce((sum, e) => sum + e.overall, 0) / evaluations.length).toFixed(1)}
                          </div>
                          <div className="text-xs text-red-700">Overall</div>
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      {evaluations.map((evaluation) => (
                        <div key={evaluation.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-900">
                              Evaluation from {evaluation.user_id.slice(0, 8)}...
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(evaluation.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-2 mb-3">
                            <div className="text-center">
                              <div className="text-sm font-medium">{evaluation.design}/5</div>
                              <div className="text-xs text-gray-500">Design</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium">{evaluation.speakers}/5</div>
                              <div className="text-xs text-gray-500">Speakers</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium">{evaluation.facilities}/5</div>
                              <div className="text-xs text-gray-500">Facilities</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium">{evaluation.participation}/5</div>
                              <div className="text-xs text-gray-500">Participation</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium">{evaluation.overall}/5</div>
                              <div className="text-xs text-gray-500">Overall</div>
                            </div>
                          </div>
                          {evaluation.benefits && (
                            <div className="mb-2">
                              <span className="text-sm font-medium text-gray-700">Benefits:</span>
                              <p className="text-sm text-gray-600 mt-1">{evaluation.benefits}</p>
                            </div>
                          )}
                          {evaluation.problems && (
                            <div className="mb-2">
                              <span className="text-sm font-medium text-gray-700">Problems:</span>
                              <p className="text-sm text-gray-600 mt-1">{evaluation.problems}</p>
                            </div>
                          )}
                          {evaluation.comments && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Comments:</span>
                              <p className="text-sm text-gray-600 mt-1">{evaluation.comments}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {evaluations.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No evaluations yet</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="registrations" className="space-y-4">
                    <div className="space-y-2">
                      {registrations.map((registration) => (
                        <div key={registration.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {registration.first_name} {registration.middle_initial} {registration.last_name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {registration.email} • {registration.program} • {registration.section}
                            </div>
                            <div className="text-xs text-gray-500">
                              {registration.college}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(registration.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {registrations.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No registrations yet</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {post.post_type === 'poll' && (
                <div>
                  <div className="space-y-4 mb-6">
                    {getPollOptions().map((option, index) => {
                      const voteCount = votes.filter(v => v.option_index === index).length;
                      const totalVotes = votes.length;
                      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{option}</span>
                            <span className="text-sm text-gray-600">{voteCount} votes ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-sm text-gray-500">
                    Total votes: {votes.length}
                  </div>
                </div>
              )}

              {post.post_type === 'feedback' && (
                <div className="space-y-4">
                  {formResponses.map((response) => (
                    <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-900">
                          Response from {response.user_id.slice(0, 8)}...
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(response.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {getFormFields().map((field, index) => (
                          <div key={index}>
                            <span className="text-sm font-medium text-gray-700">{String(field.question)}:</span>
                            <p className="text-sm text-gray-600 mt-1">
                              {String(response.responses[String(field.question)]) || 'No response'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {formResponses.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No responses yet</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
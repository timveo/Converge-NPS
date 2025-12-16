import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Download } from 'lucide-react';

const mockSchedule = [
  {
    id: '1',
    title: 'AI in Defense: Current Trends',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    location: 'Main Hall',
    type: 'keynote',
    day: 'Day 1 - Jan 28',
  },
  {
    id: '2',
    title: 'Autonomous Systems Workshop',
    startTime: '2:00 PM',
    endTime: '4:00 PM',
    location: 'Lab 3',
    type: 'workshop',
    day: 'Day 1 - Jan 28',
  },
];

export default function MySchedulePage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Schedule</h1>
            <p className="text-muted-foreground mt-1">{mockSchedule.length} sessions</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export ICS
          </Button>
        </div>

        <div className="space-y-6">
          {['Day 1 - Jan 28', 'Day 2 - Jan 29', 'Day 3 - Jan 30'].map((day) => {
            const daySessions = mockSchedule.filter((s) => s.day === day);

            return (
              <div key={day}>
                <h2 className="text-xl font-bold mb-4">{day}</h2>
                {daySessions.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No sessions scheduled for this day
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {daySessions.map((session) => (
                      <Card key={session.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center bg-blue-50 rounded-lg p-3 min-w-[80px]">
                              <Clock className="w-5 h-5 text-blue-600 mb-1" />
                              <span className="text-sm font-semibold text-blue-600">
                                {session.startTime}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {session.endTime}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-lg font-semibold">{session.title}</h3>
                                <Badge>{session.type}</Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">{session.location}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}

'use client';

import { User, Briefcase, Users, Target, AlertCircle, Brain, Heart, Sparkles, Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { type MemoryOverview, type LifeArea, lifeAreaLabels } from '../types';

interface MemoryOverviewProps {
  data?: MemoryOverview;
  isLoading?: boolean;
}

const areaIcons: Record<LifeArea, React.ReactNode> = {
  health: <Heart className="h-4 w-4" />,
  financial: <span className="text-sm">$</span>,
  relationships: <Users className="h-4 w-4" />,
  career: <Briefcase className="h-4 w-4" />,
  personal_growth: <Target className="h-4 w-4" />,
  leisure: <Sparkles className="h-4 w-4" />,
  spirituality: <Sun className="h-4 w-4" />,
  mental_health: <Brain className="h-4 w-4" />,
};

const areaColors: Record<LifeArea, string> = {
  health: 'text-red-500',
  financial: 'text-green-500',
  relationships: 'text-pink-500',
  career: 'text-blue-500',
  personal_growth: 'text-purple-500',
  leisure: 'text-yellow-500',
  spirituality: 'text-indigo-500',
  mental_health: 'text-teal-500',
};

export function MemoryOverviewComponent({ data, isLoading }: MemoryOverviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { userMemory, stats } = data;

  return (
    <div className="space-y-4">
      {/* User Profile Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {userMemory.occupation && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-3 w-3 text-muted-foreground" />
              <span>{userMemory.occupation}</span>
            </div>
          )}
          {userMemory.familyContext && (
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span>{userMemory.familyContext}</span>
            </div>
          )}
          {userMemory.currentGoals.length > 0 && (
            <div className="flex items-start gap-2">
              <Target className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <span className="font-medium">Metas:</span>
                <ul className="list-disc list-inside text-muted-foreground">
                  {userMemory.currentGoals.slice(0, 3).map((goal, i) => (
                    <li key={i}>{goal}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {userMemory.currentChallenges.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <span className="font-medium">Desafios:</span>
                <ul className="list-disc list-inside text-muted-foreground">
                  {userMemory.currentChallenges.slice(0, 3).map((challenge, i) => (
                    <li key={i}>{challenge}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats by Area */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Conhecimentos</span>
            <span className="text-muted-foreground font-normal">{stats.total} itens</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(stats.byArea) as LifeArea[]).map((area) => (
              <div
                key={area}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`shrink-0 ${areaColors[area]}`}>{areaIcons[area]}</span>
                  <span className="text-sm truncate">{lifeAreaLabels[area]}</span>
                </div>
                <span className="text-sm font-medium shrink-0">{stats.byArea[area]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

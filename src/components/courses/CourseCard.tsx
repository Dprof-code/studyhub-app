'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type CourseCardProps = {
    code: string;
    title: string;
    synopsis: string;
    department: string;
    level: number;
};

export function CourseCard({ code, title, synopsis, department, level }: CourseCardProps) {
    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{code}</p>
                    </div>
                    <div className="flex gap-2">
                        <Badge>{`${level} Level`}</Badge>
                        <Badge variant="outline">{department}</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{synopsis}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Link href={`/courses/${code}`} passHref>
                    <Button variant="default">
                        View Course
                        <span className="material-symbols-outlined ml-2">arrow_forward</span>
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
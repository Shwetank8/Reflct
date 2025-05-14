'use server'

interface JournalEntryData {
  title: string;
  content: string;
  mood: string;         
  moodQuery: string; 
  moodScore:Number;  
  collectionId?: string;
  moodImageUrl?:string;
  userId?:string;
}


import { getMoodById, MOODS } from "@/app/lib/moods"
import { db } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { getPixabayImage } from "./public"
import { revalidatePath } from "next/cache";
import { request } from "@arcjet/next";
import aj from "@/lib/arcjet";
import { Prisma } from "@/lib/generated/prisma";

export async function createJournalEntry(data:JournalEntryData) {
    try {
        const {userId} = await auth()
        if(!userId) throw new Error("User not authenticated")

        // ArcJet Rate Limiting

        const req = await request()

        const decision = await aj.protect(req,{
            userId,
            requested:1,
        });

        if (decision.isDenied()){
            if(decision.reason.isRateLimit()) {
                const {remaining,reset} = decision.reason
                console.error({
                    code:"Rate_LIMIT_EXCEEDED",
                    details:{
                        remaining,
                        resetInSeconds:reset,
                    },
                });
                throw new Error("Too many requests. Please try again later.")
            }   
            throw new Error("Request blocked.")
        }

        const user = await db.user.findUnique({
            where:{
                clerkUserId:userId
            },
        });
        if(!user) throw new Error("User not found")

        const moodKey = data.mood.toUpperCase() as keyof typeof MOODS;
        const mood = MOODS[moodKey];
        if(!mood) throw new Error("Invalid mood")

        const moodImageUrl = await getPixabayImage(data.moodQuery)

        const entry = await db.entry.create({
            data:{
                title:data.title,
                content:data.content,
                mood:mood.id,
                moodScore:mood.score,
                moodImageUrl,
                userId:user.id,
                collectionId:data.collectionId || null,
            }
        });

        await db.draft.deleteMany({
            where:{userId:user.id}
        });

        revalidatePath('/dashboard');
        return entry;

    } catch (error) {
        console.log(error)
    }
}


export async function getJournalEntries({
  collectionId,
  orderBy = "desc",
}: {
  collectionId?: string;
  orderBy?:Prisma.SortOrder ;
} = {}) {
    try {
        const {userId} = await auth()
        if(!userId) throw new Error("User not authenticated")

        const user = await db.user.findUnique({
            where:{
                clerkUserId:userId
            },
        });
        if(!user) throw new Error("User not found");

        const entries = await db.entry.findMany({
            where:{
                userId:user.id,
                ...(collectionId==='unorganized'?{collectionId:null}
                    :collectionId ? {collectionId}
                    : {}
                ),
            },
            include:{
                collection:{
                    select:{
                        id:true,
                        name:true,
                    },
                },
            },
            orderBy:{
                createdAt:orderBy,
            },
        });

        const entriesWithMoodData = entries.map((entry) => ({
            ...entry,
            moodData: getMoodById(entry.mood)
        }));

        return{
            success:true,
            data:{
                entries:entriesWithMoodData,
            }
        };

    } catch (error) {
        return {success:false,error}
    }
}

export async function getJournalEntry(id:any) {
    try {
        const {userId} = await auth()
        if(!userId) throw new Error("User not authenticated")

        const user = await db.user.findUnique({
            where:{
                clerkUserId:userId
            },
        });
        if(!user) throw new Error("User not found");

        const entry = await db.entry.findFirst({
            where:{
                id,
                userId:user.id
            },
            include:{
                collection:{
                    select:{
                        id:true,
                        name:true,
                    }
                }
            }
        });

        if(!entry) throw new Error("Entry not Found")
        return entry

    } catch (error) {
        throw new Error
    }
}

export async function deleteJournalEntry(id:any) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Check if entry exists and belongs to user
    const entry = await db.entry.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!entry) throw new Error("Entry not found");

    // Delete the entry
    await db.entry.delete({
      where: { id },
    });

    revalidatePath("/dashboard");
    return entry;
  } catch (error) {
    throw new Error("Delete");
  }
}
export async function updateJournalEntry(data:any) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Check if entry exists and belongs to user
    const existingEntry = await db.entry.findFirst({
      where: {
        id: data.id,
        userId: user.id,
      },
    });

    if (!existingEntry) throw new Error("Entry not found");

    // Get mood data
    const moodKey = (data.mood as string).toUpperCase();
    const mood = (MOODS as any)[moodKey]
    if (!mood) throw new Error("Invalid mood");

    // Get new mood image if mood changed
    let moodImageUrl = existingEntry.moodImageUrl;
    if (existingEntry.mood !== mood.id) {
      moodImageUrl = await getPixabayImage(data.moodQuery);
    }

    // Update the entry
    const updatedEntry = await db.entry.update({
      where: { id: data.id },
      data: {
        title: data.title,
        content: data.content,
        mood: mood.id,
        moodScore: mood.score,
        moodImageUrl,
        collectionId: data.collectionId || null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/journal/${data.id}`);
    return updatedEntry;
  } catch (error) {
    throw new Error;
  }
}

export async function getDraft() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const draft = await db.draft.findUnique({
      where: { userId: user.id },
    });

    return { success: true, data: draft };
  } catch (error) {
    return { success: false, error };
  }
}

export async function saveDraft(data:any) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const draft = await db.draft.upsert({
      where: { userId: user.id },
      create: {
        title: data.title,
        content: data.content,
        mood: data.mood,
        userId: user.id,
      },
      update: {
        title: data.title,
        content: data.content,
        mood: data.mood,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: draft };
  } catch (error) {
    return { success: false, error};
  }
}
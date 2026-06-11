import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const staticTestimonials = [
  {
    name: 'Louise',
    meta: 'Student for 7 years',
    rating: 5,
    text: 'Becky is a wonderful yoga teacher. Her classes are friendly, inclusive and uplifting, and equally suited to beginners and those more experienced, to the young and those of more mature age. She has a warm, wise and calm presence, and we love her!',
  },
  {
    name: 'Debbie',
    meta: '',
    rating: 5,
    text: "I attended Becky's beautiful classes for more than 6 years. To sum up: calms the mind, balm for the soul, each class a different challenge for the body, incorporating all 3 together in a way no other teacher has done in the past. We all miss her!",
  },
  {
    name: 'Carolyn and Mark',
    meta: '',
    rating: 5,
    text: "We first met Becky at a retreat she held at Brampston beach. We had a great experience and have since attended her classes. Her expert knowledge and calming vibe is magical. Can't recommend her enough. Loved by all.",
  },
  {
    name: 'Carlos',
    meta: '',
    rating: 5,
    text: "I devoted my time to attend Becky's classes weekly for over 3 years. Her class isn't a routine, alternates different poses, from core to flexibility, focuses the mind body connection by breath work to start the class, including affirmation. I love the integration of the spiritual aspect of her class. I always found myself centred, positive and calm for the day after her classes. Namaste.",
  },
  {
    name: 'Coleen',
    meta: 'Student for 7 years',
    rating: 5,
    text: 'Rebecca is a brilliant teacher, she is fun and communicates well so the moves are easy to follow. All the classes had a genuine friendly feel and everyone was able to participate to their own level. I would thoroughly recommend Rebecca as a wonderful teacher and person.',
  },
  {
    name: 'Ann',
    meta: '',
    rating: 5,
    text: 'During the last 8 years I have found Rebecca to be a truly inspirational yoga teacher. Not only is she a master of yoga, she also demonstrates patience and kindness. She has been greatly missed by her students in Far North Qld, but we live in hope that one day she may return.',
  },
  {
    name: 'Frances',
    meta: 'Student for 5 years',
    rating: 5,
    text: "I had never done any previous yoga classes and started with Rebecca after finishing full time work. I found the classes beneficial physically but also for the mind. Her personal touches within the class are very special. Starting with a warm welcome, and she was always aware of everyone's differences within the practice. Attending Rebecca's classes was also the start of belonging to a wonderful community. Rebecca is both a beautiful instructor and person.",
  },
  {
    name: 'Sally',
    meta: '',
    rating: 5,
    text: "I enjoyed Becky's yoga classes for well over a decade. In her soothing voice she began and ended her classes with gentle, partly guided meditations. Her participants were at various levels, and she always encouraged modifications to suit our own bodies. I am so sorry that she moved away!",
  },
  {
    name: 'Shelagh',
    meta: '',
    rating: 5,
    text: 'Love your teaching style Becky. You guide each of us to achieve the very best we can. Thank you.',
  },
  {
    name: 'Stephanie',
    meta: '',
    rating: 5,
    text: 'Becky has the gift to inspire and educate with the wisdom of an old soul. I would highly recommend anyone who wants to nurture their body and soul to attend one of her fantastic and rejuvenating retreats.',
  },
  {
    name: 'Basha',
    meta: '',
    rating: 5,
    text: "I love going to Becky\u2019s classes. She is one of the best Yoga teachers I have been to over the years and I miss her very much.",
  },
  {
    name: 'Fiona',
    meta: '',
    rating: 5,
    text: "I attended my first Yoga class ever in my mid 60\u2019s. I thought what am I doing here with all these experienced people. I don\u2019t belong. How wrong was I ! Becky made me feel so comfortable and welcome and gave me adjustments so I could participate in the class. I am astounded by the improvements I have made. Becky reminded me that you are never too old to learn something new.",
  },
];

export async function POST(req: NextRequest) {
  try {
    const batch = adminDb.batch();

    for (let i = 0; i < staticTestimonials.length; i++) {
      const t = staticTestimonials[i];
      const ref = adminDb.collection('testimonials').doc();
      batch.set(ref, {
        name: t.name,
        meta: t.meta,
        rating: t.rating,
        text: t.text,
        order: i,
        published: true,
        createdAt: new Date().toISOString(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Seeded ${staticTestimonials.length} testimonials into Firestore`,
    });
  } catch (error: any) {
    console.error('Seed testimonials error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed testimonials' },
      { status: 500 }
    );
  }
}

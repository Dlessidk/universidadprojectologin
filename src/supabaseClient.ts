const mockBuilder: any = {
  select: () => mockBuilder,
  insert: () => Promise.resolve({ data: [], error: null }),
  update: () => mockBuilder,
  delete: () => mockBuilder,
  eq: () => mockBuilder,
  order: () => Promise.resolve({ data: [], error: null }),
  single: () => Promise.resolve({ data: null, error: null }),
  then: (resolve: any) => resolve({ data: [], error: null }),
};

export const supabase: any = {
  from: () => mockBuilder,
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: { path: 'mock.jpg' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
};

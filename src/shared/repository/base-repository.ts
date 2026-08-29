import { Prisma } from "../../generated/prisma/client";

// ─── Pagination Types ────────────────────────────────────────

export interface OffsetPaginationMeta {
  type: "offset";
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CursorPaginationMeta {
  type: "cursor";
  nextCursor: string | null;
  previousCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  count: number;
}

export interface OffsetPaginationResponse<T> {
  data: T[];
  meta: OffsetPaginationMeta;
}

export interface CursorPaginationResponse<T> {
  data: T[];
  meta: CursorPaginationMeta;
}

// ─── Prisma Delegate Type ────────────────────────────────────
// 🧠 WHY THIS COMPLICATED TYPE?
//
// Prisma generates a "delegate" for each model — e.g., prisma.user,
// prisma.ride, prisma.driver. Each delegate has the same methods
// (findUnique, findMany, create, update, etc.) but different types.
//
// This type says: "give me any Prisma delegate that has these methods."
// That way, our BaseRepository works with ANY model, not just one.

type PrismaDelegate<T> = {
  findUnique(args: {
    where: Prisma.Args<T, "findUnique">["where"];
    include?: Prisma.Args<T, "findUnique">["include"];
    select?: Prisma.Args<T, "findUnique">["select"];
  }): Promise<any>;

  findFirst(args: {
    where?: Prisma.Args<T, "findFirst">["where"];
    include?: Prisma.Args<T, "findFirst">["include"];
    select?: Prisma.Args<T, "findFirst">["select"];
    orderBy?: Prisma.Args<T, "findFirst">["orderBy"];
  }): Promise<any>;

  findMany(args?: {
    where?: Prisma.Args<T, "findMany">["where"];
    include?: Prisma.Args<T, "findMany">["include"];
    select?: Prisma.Args<T, "findMany">["select"];
    orderBy?: Prisma.Args<T, "findMany">["orderBy"];
    skip?: number;
    take?: number;
    cursor?: Prisma.Args<T, "findMany">["cursor"];
  }): Promise<any[]>;

  count(args?: {
    where?: Prisma.Args<T, "count">["where"];
  }): Promise<any>;

  aggregate(args?: {
    where?: Prisma.Args<T, "aggregate">["where"];
    _count?: boolean | object;
    _sum?: object;
    _avg?: object;
    _min?: object;
    _max?: object;
  }): Promise<any>;

  create(args: {
    data: Prisma.Args<T, "create">["data"];
    include?: Prisma.Args<T, "create">["include"];
    select?: Prisma.Args<T, "create">["select"];
  }): Promise<any>;

  update(args: {
    where: Prisma.Args<T, "update">["where"];
    data: Prisma.Args<T, "update">["data"];
    include?: Prisma.Args<T, "update">["include"];
    select?: Prisma.Args<T, "update">["select"];
  }): Promise<any>;

  delete(args: {
    where: Prisma.Args<T, "delete">["where"];
  }): Promise<any>;

  deleteMany(args: {
    where: Prisma.Args<T, "deleteMany">["where"];
  }): Promise<Prisma.BatchPayload>;

  createMany(args: {
    data: Prisma.Args<T, "createMany">["data"];
    skipDuplicates?: Prisma.Args<T, "createMany">["skipDuplicates"];
  }): Promise<any>;

  updateMany(args: {
    where?: Prisma.Args<T, "updateMany">["where"];
    data: Prisma.Args<T, "updateMany">["data"];
  }): Promise<Prisma.BatchPayload>;

  upsert(args: {
    where: Prisma.Args<T, "upsert">["where"];
    create: Prisma.Args<T, "upsert">["create"];
    update: Prisma.Args<T, "upsert">["update"];
    include?: Prisma.Args<T, "upsert">["include"];
  }): Promise<any>;
};

/**
 * 🧠 WHY A BASE REPOSITORY?
 *
 * Without this, every model repository would repeat the same code:
 *
 *   class UserRepository {
 *     async findById(id: string) { return prisma.user.findUnique({ where: { id } }); }
 *     async findAll() { return prisma.user.findMany(); }
 *     async create(data) { return prisma.user.create({ data }); }
 *     async update(id, data) { return prisma.user.update({ where: { id }, data }); }
 *     async delete(id) { return prisma.user.delete({ where: { id } }); }
 *   }
 *
 *   class RideRepository {
 *     async findById(id: string) { return prisma.ride.findUnique({ where: { id } }); }
 *     async findAll() { return prisma.ride.findMany(); }
 *     ... // exact same methods, just different model name
 *   }
 *
 * BaseRepository eliminates that repetition. Each model repository
 * just extends BaseRepository and gets all CRUD operations for free.
 * You only write model-specific methods (like "findNearbyDrivers").
 *
 * ─── Design Pattern: Repository Pattern ─────────────────────
 *
 * Your route/controller never touches Prisma directly.
 * Instead: Route → Service → Repository → Prisma
 *
 * Why? Separation of concerns.
 * - Route: handles HTTP (request/response)
 * - Service: business logic ("can this driver accept this ride?")
 * - Repository: database queries ("find all available drivers near this point")
 * - Prisma: SQL generation
 *
 * This makes testing easier too — you can mock the repository
 * without needing a real database.
 */
export abstract class BaseRepository<TDelegate, TResult> {
  constructor(protected readonly model: PrismaDelegate<TDelegate>) {}

  // ─── Cursor Helpers ─────────────────────────────────────
  // Cursors are opaque strings. We encode/decode them so the
  // client never sees raw database IDs.
  protected decodedCursor(cursor: string): string {
    return Buffer.from(cursor, "base64url").toString("utf-8");
  }

  protected encodeCursor(value: unknown): string {
    return Buffer.from(String(value)).toString("base64url");
  }

  // ─── Basic CRUD ─────────────────────────────────────────

  async findUnique(args: {
    where: Prisma.Args<TDelegate, "findUnique">["where"];
    include?: Prisma.Args<TDelegate, "findUnique">["include"];
    select?: Prisma.Args<TDelegate, "findUnique">["select"];
  }): Promise<TResult | null> {
    return this.model.findUnique(args);
  }

  async findFirst(args: {
    where?: Prisma.Args<TDelegate, "findFirst">["where"];
    include?: Prisma.Args<TDelegate, "findFirst">["include"];
    select?: Prisma.Args<TDelegate, "findFirst">["select"];
    orderBy?: Prisma.Args<TDelegate, "findFirst">["orderBy"];
  }): Promise<TResult | null> {
    return this.model.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.Args<TDelegate, "findMany">["where"];
    include?: Prisma.Args<TDelegate, "findMany">["include"];
    select?: Prisma.Args<TDelegate, "findMany">["select"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
    skip?: number;
    take?: number;
  }): Promise<TResult[]> {
    return this.model.findMany(args);
  }

  async create(args: {
    data: Prisma.Args<TDelegate, "create">["data"];
    include?: Prisma.Args<TDelegate, "create">["include"];
    select?: Prisma.Args<TDelegate, "create">["select"];
  }): Promise<TResult> {
    return this.model.create(args);
  }

  async update(args: {
    where: Prisma.Args<TDelegate, "update">["where"];
    data: Prisma.Args<TDelegate, "update">["data"];
    include?: Prisma.Args<TDelegate, "update">["include"];
    select?: Prisma.Args<TDelegate, "update">["select"];
  }): Promise<TResult> {
    return this.model.update(args);
  }

  async delete({
    where,
  }: {
    where: Prisma.Args<TDelegate, "delete">["where"];
  }): Promise<TResult> {
    return this.model.delete({ where });
  }

  async deleteMany(args: {
    where: Prisma.Args<TDelegate, "deleteMany">["where"];
  }): Promise<Prisma.BatchPayload> {
    return this.model.deleteMany(args);
  }

  async createMany(args: {
    data: Prisma.Args<TDelegate, "createMany">["data"];
    skipDuplicates?: Prisma.Args<TDelegate, "createMany">["skipDuplicates"];
  }): Promise<Prisma.BatchPayload> {
    return this.model.createMany(args);
  }

  async updateMany(args: {
    where?: Prisma.Args<TDelegate, "updateMany">["where"];
    data: Prisma.Args<TDelegate, "updateMany">["data"];
  }): Promise<Prisma.BatchPayload> {
    return this.model.updateMany(args);
  }

  async upsert(args: {
    where: Prisma.Args<TDelegate, "upsert">["where"];
    create: Prisma.Args<TDelegate, "upsert">["create"];
    update: Prisma.Args<TDelegate, "upsert">["update"];
    include?: Prisma.Args<TDelegate, "upsert">["include"];
  }): Promise<TResult> {
    return this.model.upsert(args);
  }

  async count({
    where,
  }: {
    where?: Prisma.Args<TDelegate, "count">["where"];
  }): Promise<number> {
    return this.model.count({ where });
  }

  async aggregate(args: {
    where?: Prisma.Args<TDelegate, "aggregate">["where"];
    _count?: boolean | object;
    _sum?: object;
    _avg?: object;
    _min?: object;
    _max?: object;
  }): Promise<any> {
    return this.model.aggregate(args);
  }

  // ─── Offset Pagination ──────────────────────────────────
  /**
   * 🧠 OFFSET PAGINATION — like flipping pages in a book:
   *
   * Page 1 → records 1-20
   * Page 2 → records 21-40
   * Page 3 → records 41-60
   *
   * ✅ Simple to implement and understand
   * ✅ "Go to page 5" works instantly
   *
   * ❌ Problem: If someone inserts a record while you're on page 2,
   *    your page 2 now shows a different set of results.
   *    (Like a page of a book being rewritten while you read it.)
   *
   * Use when: total count matters, pages are small, data doesn't
   * shift much between requests.
   */
  async findManyWithOffsetPagination(args: {
    where?: Prisma.Args<TDelegate, "findMany">["where"];
    include?: Prisma.Args<TDelegate, "findMany">["include"];
    select?: Prisma.Args<TDelegate, "findMany">["select"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
    page?: number;
    pageSize?: number;
  }): Promise<OffsetPaginationResponse<TResult>> {
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: args.where,
        include: args.include,
        select: args.select,
        orderBy: args.orderBy,
        skip,
        take: pageSize,
      }),
      this.model.count({ where: args.where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      meta: {
        type: "offset",
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ─── Cursor Pagination ──────────────────────────────────
  /**
   * 🧠 CURSOR PAGINATION — like bookmarks in a book:
   *
   * Instead of "page 3", you say "give me 20 records after this bookmark."
   *
   * First request:   no cursor → gets records 1-20, returns cursor "20"
   * Second request:  cursor "20" → gets records 21-40, returns cursor "40"
   * Third request:   cursor "40" → gets records 41-60, returns cursor "60"
   *
   * ✅ No data shifting — cursor points to exact position
   * ✅ Better for infinite scroll (Instagram feed, Twitter timeline)
   * ✅ Works well with large datasets
   *
   * ❌ Can't jump to "page 5" directly
   * ❌ Slightly more complex to implement
   *
   * Use when: infinite scroll, real-time feeds, large datasets.
   */
  async findManyWithCursorPagination(args: {
    where?: Prisma.Args<TDelegate, "findMany">["where"];
    include?: Prisma.Args<TDelegate, "findMany">["include"];
    select?: Prisma.Args<TDelegate, "findMany">["select"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
    take?: number;
    cursor?: string | null;
    cursorField?: string;
    direction?: "forward" | "backward";
  }): Promise<CursorPaginationResponse<TResult>> {
    const take = Math.min(100, Math.max(1, args.take ?? 20));
    const cursorField = args.cursorField ?? "id";
    const direction = args.direction ?? "forward";

    const decodedCursor = args.cursor
      ? this.decodedCursor(args.cursor)
      : undefined;

    // 🧠 WHY take + 1?
    // We fetch ONE EXTRA record to know if there's a next page.
    // If we get 21 records when we asked for 20, there's a next page.
    // That extra record is used to detect "hasMore" — then we trim it off.
    const [data, count] = await Promise.all([
      this.model.findMany({
        where: args.where,
        include: args.include,
        select: args.select,
        orderBy: args.orderBy,
        take: take + 1,
        skip: decodedCursor ? 1 : 0, // Skip the cursor record itself
        cursor: decodedCursor ? { [cursorField]: decodedCursor } : undefined,
      }),
      this.model.count({ where: args.where }),
    ]);

    const hasExtraRecord = data.length > take;
    const records: TResult[] = hasExtraRecord ? data.slice(0, take) : data;

    const firstRecord = records[0] as Record<string, any> | undefined;
    const lastRecord = records[records.length - 1] as
      | Record<string, any>
      | undefined;

    const nextCursor =
      direction === "forward" && hasExtraRecord && lastRecord
        ? this.encodeCursor(lastRecord[cursorField])
        : null;

    const previousCursor =
      direction === "backward" && hasExtraRecord && firstRecord
        ? this.encodeCursor(firstRecord[cursorField])
        : (args.cursor ?? null);

    return {
      data: records,
      meta: {
        type: "cursor",
        previousCursor,
        nextCursor,
        hasNextPage: direction === "forward" ? hasExtraRecord : !args.cursor,
        hasPreviousPage:
          direction === "backward" ? hasExtraRecord : !!args.cursor,
        count,
      },
    };
  }
}

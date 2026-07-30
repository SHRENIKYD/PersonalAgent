import { ConceptTopic } from './models';

/**
 * Concept questions, not algorithm problems — clean study notes instead of one paragraph:
 * a definition, the mechanism, an example/pseudocode where one actually clarifies things, and
 * why it comes up in interviews. See prep-dsa-data.ts for the DSA format (brute-force /
 * optimized / pseudocode, since those are algorithm problems rather than concepts).
 */
export const CS_TOPICS: ConceptTopic[] = [
  {
    name: 'Operating Systems',
    items: [
      {
        name: 'Process vs Thread',
        definition: 'A process is an independent running program with its own memory space; a thread is a unit of execution inside a process that shares that memory with other threads in the same process.',
        howItWorks: 'The OS gives every process its own virtual address space, file handles, and at least one thread. Threads within that process share the heap, global variables, and open files, but each thread keeps its own stack and program counter — that\'s what lets two threads run different code paths concurrently while still reading and writing the same in-memory data.',
        example:
          'Process P1\n' +
          '  Thread A: reads shared_counter, computes, writes shared_counter\n' +
          '  Thread B: reads shared_counter, computes, writes shared_counter\n' +
          '  # both threads share the same shared_counter memory — needs a lock',
        whyItMatters: 'Interviewers use this to check whether you understand why threads are cheap but need synchronization, while processes are safe but expensive to create and communicate between.',
      },
      {
        name: 'Deadlock — conditions & prevention',
        definition: 'A deadlock is a state where two or more processes are each waiting on a resource the other holds, so none of them can ever proceed.',
        howItWorks: 'It needs four conditions simultaneously: mutual exclusion (a resource can\'t be shared), hold-and-wait (a process holds one resource while waiting for another), no preemption (resources can\'t be forcibly taken away), and circular wait (a cycle of processes each waiting on the next). Breaking any single one of the four prevents deadlock.',
        example:
          '# Classic circular wait:\n' +
          'Process A: lock(Resource1); wait for Resource2\n' +
          'Process B: lock(Resource2); wait for Resource1\n' +
          '# Fix: always acquire resources in the same global order (e.g. always 1 before 2)',
        whyItMatters: 'This is the standard "explain the four conditions and how to prevent it" question in OS rounds — the fix questions usually reduce to "which condition would you break."',
      },
      {
        name: 'Paging vs Segmentation',
        definition: 'Paging splits memory into fixed-size blocks (pages); segmentation splits memory into variable-size logical units that match how a program actually thinks about its memory (code, stack, heap).',
        howItWorks: 'Paging avoids external fragmentation (free memory scattered in small unusable chunks) because every page is the same size, but can waste space inside a page (internal fragmentation). Segmentation matches program structure more naturally but can fragment external free space since segments vary in size. Most modern systems use paging, sometimes with a segmentation-like view layered on top.',
        whyItMatters: 'Interviewers ask this to see if you understand the fragmentation trade-off, which comes up again in database storage and memory allocator design.',
      },
      {
        name: 'Virtual Memory',
        definition: 'Virtual memory gives each process the illusion of a large, private, contiguous address space, while the OS actually maps pieces of it to physical RAM (or disk) behind the scenes.',
        howItWorks: 'A page table translates virtual addresses to physical ones per process. When a process accesses memory that isn\'t currently in RAM, a page fault triggers the OS to load it from disk. This lets programs run without fitting entirely in RAM, and isolates processes so one can\'t directly see or corrupt another\'s memory.',
        whyItMatters: 'It\'s the mechanism behind both memory protection and why your program can "use" more memory than physically exists — a common follow-up to paging questions.',
      },
      {
        name: 'CPU Scheduling Algorithms',
        definition: 'A CPU scheduler decides which ready process gets to run next on the CPU.',
        howItWorks: 'Round Robin gives every process a fixed time slice in rotation — fair, but frequent context switches add overhead. Shortest Job First runs whichever process needs the least CPU time next, minimizing average wait time but risking starving long jobs. Priority scheduling runs higher-priority processes first, which needs aging (gradually raising a waiting process\'s priority) to prevent starvation.',
        example:
          '# Round Robin, quantum = 4\n' +
          'queue = [P1(burst=6), P2(burst=2), P3(burst=8)]\n' +
          'run P1 for 4 -> requeue P1(remaining=2)\n' +
          'run P2 for 2 -> P2 done\n' +
          'run P3 for 4 -> requeue P3(remaining=4)\n' +
          'run P1 for 2 -> P1 done\n' +
          'run P3 for 4 -> P3 done',
        whyItMatters: 'Comparing these algorithms\' trade-offs (fairness vs. throughput vs. starvation risk) is a near-guaranteed OS interview question.',
      },
      {
        name: 'Semaphore vs Mutex',
        definition: 'A mutex is a lock meant to be held and released by the same thread, protecting one resource from concurrent access. A semaphore is a counter that can allow a fixed number of threads through at once.',
        howItWorks: 'A mutex is binary (locked/unlocked) and ownership matters — typically only the thread that locked it can unlock it. A semaphore\'s count can be signaled by a different thread than the one that waited, which is what makes it suited to producer/consumer patterns where one thread produces work and a different thread consumes it.',
        example:
          '# Semaphore as a bounded buffer gate\n' +
          'empty_slots = Semaphore(capacity)\n' +
          'full_slots  = Semaphore(0)\n' +
          'producer: wait(empty_slots); add_item(); signal(full_slots)\n' +
          'consumer: wait(full_slots);  remove_item(); signal(empty_slots)',
        whyItMatters: 'This distinction trips people up constantly — expect a follow-up asking you to pick the right one for a specific scenario.',
      },
      {
        name: 'Context Switching',
        definition: 'A context switch saves the current process/thread\'s CPU state so it can resume later, then loads another\'s saved state so it can run.',
        howItWorks: 'The OS saves registers, the program counter, and other CPU state into that process\'s control block, then restores the next process\'s saved state from its own control block. It\'s necessary for multitasking, but it\'s pure overhead — no useful work happens during the switch itself.',
        whyItMatters: 'This is why "just add more threads" isn\'t free — excessive context switching is a real, measurable performance cost interviewers expect you to know about.',
      },
      {
        name: 'Thrashing',
        definition: 'Thrashing is when a system spends more time swapping pages in and out of memory than actually executing code.',
        howItWorks: 'It usually happens when too many processes compete for too little RAM, so each one\'s working set keeps getting evicted before it\'s done using it, triggering constant page faults. The fix is reducing the number of concurrently running processes (or adding RAM) rather than trying to make the swapping itself faster.',
        whyItMatters: 'It\'s the concrete failure mode behind "why did my server slow to a crawl under load" — a good real-world hook for an OS concept.',
      },
    ],
  },
  {
    name: 'DBMS',
    items: [
      {
        name: 'ACID Properties',
        definition: 'ACID is the set of four guarantees — Atomicity, Consistency, Isolation, Durability — that make database transactions safe to reason about.',
        howItWorks: 'Atomicity: a transaction either fully completes or fully rolls back, never partially. Consistency: a transaction moves the database from one valid state to another, respecting all constraints. Isolation: concurrent transactions don\'t see each other\'s incomplete work. Durability: once committed, a transaction survives a crash.',
        whyItMatters: 'This is table-stakes vocabulary for any DBMS round — expect to be asked to explain each letter and give an example of what breaks if it\'s missing.',
      },
      {
        name: 'Normalization (1NF → BCNF)',
        definition: 'Normalization restructures database tables to reduce redundant data and avoid update anomalies.',
        howItWorks: '1NF requires atomic values in every column (no repeating groups). 2NF removes partial dependencies on a composite key. 3NF removes transitive dependencies (a non-key column depending on another non-key column, not the key itself). BCNF tightens 3NF further to handle edge cases with overlapping candidate keys.',
        example:
          '# Before (violates 2NF): composite key (OrderId, ProductId)\n' +
          'Orders(OrderId, ProductId, ProductName, Qty)\n' +
          '# ProductName depends only on ProductId, not the full key -> split it out:\n' +
          'Orders(OrderId, ProductId, Qty)\n' +
          'Products(ProductId, ProductName)',
        whyItMatters: 'Normalization questions test whether you can spot redundancy and anomalies in a given schema, not just recite the definitions.',
      },
      {
        name: 'Indexing — B-Tree vs B+Tree',
        definition: 'Both are balanced tree structures that let a database find rows without scanning the whole table.',
        howItWorks: 'A B-Tree stores actual data at internal nodes as well as leaves. A B+Tree only stores data at the leaves, with internal nodes purely for navigation — and leaves are typically linked together, making range queries (like "between X and Y") much faster. That\'s why B+Trees are the more common choice for database indexes.',
        whyItMatters: 'Knowing *why* B+Trees win for databases specifically (not just "they\'re a tree") is what separates a memorized answer from an understood one.',
      },
      {
        name: 'Types of Joins',
        definition: 'A join combines rows from two or more tables based on a related column.',
        howItWorks: 'An inner join returns only rows that match in both tables. A left (or right) outer join returns all rows from one table plus matching rows from the other, filling in nulls where there\'s no match. A full outer join returns all rows from both tables, matched where possible. A cross join returns every combination of rows from both tables with no matching condition at all.',
        example:
          'SELECT u.name, o.total\n' +
          'FROM users u\n' +
          'LEFT JOIN orders o ON o.user_id = u.id\n' +
          '-- every user appears, orders columns are NULL if they never ordered',
        whyItMatters: 'SQL joins are asked constantly, often as a live query-writing exercise rather than a definitions question.',
      },
      {
        name: 'Transactions & Isolation Levels',
        definition: 'Isolation levels control how much one transaction can see of another transaction\'s in-progress changes, trading consistency for performance.',
        howItWorks: 'Read Uncommitted allows dirty reads (seeing another transaction\'s uncommitted changes). Read Committed only sees committed data, but can see different data on repeated reads within the same transaction. Repeatable Read guarantees the same read returns the same data throughout a transaction. Serializable is strictest, behaving as if transactions ran one at a time.',
        whyItMatters: 'This explains real production bugs (phantom reads, non-repeatable reads) that only show up under concurrent load — a favorite "have you actually debugged this" question.',
      },
      {
        name: 'CAP Theorem',
        definition: 'In a distributed system, you can\'t simultaneously guarantee Consistency, Availability, and Partition tolerance — you have to give up one when a network partition actually happens.',
        howItWorks: 'Consistency means every read sees the latest write. Availability means every request gets a response. Partition tolerance means the system keeps working despite network splits. Since partitions are unavoidable in practice, the real choice most systems face is between consistency and availability during a partition, not all three at once in normal operation.',
        whyItMatters: 'This underlies why SQL vs NoSQL and different distributed databases make different trade-offs — a foundational concept for system design rounds too.',
      },
      {
        name: 'SQL vs NoSQL',
        definition: 'SQL databases enforce a fixed schema and strong relational structure. NoSQL databases (document, key-value, column, graph) trade some of that structure for flexibility and horizontal scalability.',
        howItWorks: 'SQL is great for data with clear relationships and strict consistency needs — enforced via schemas, foreign keys, and transactions. NoSQL suits large-scale or rapidly-changing data models where rigid schemas would slow development or scaling.',
        whyItMatters: 'The real answer interviewers want isn\'t "NoSQL is faster" — it\'s knowing which trade-offs matter for a given use case.',
      },
      {
        name: 'Sharding vs Replication',
        definition: 'Sharding splits a dataset across multiple machines, each holding a different subset. Replication copies the same data across multiple machines.',
        howItWorks: 'Sharding scales write and storage capacity, since each shard only holds part of the data, but makes cross-shard queries and transactions harder. Replication scales read capacity and improves availability, since a copy exists on multiple machines, but doesn\'t help you store more data than one machine could already hold.',
        whyItMatters: 'These two are commonly combined in real systems, and interviewers want to see you know which problem each one actually solves.',
      },
    ],
  },
  {
    name: 'Computer Networks',
    items: [
      {
        name: 'OSI Model vs TCP/IP Model',
        definition: 'The OSI model is a 7-layer conceptual framework for networking; the TCP/IP model is the 4-layer model that describes how the real internet is actually built.',
        howItWorks: 'OSI layers: Physical, Data Link, Network, Transport, Session, Presentation, Application — mostly used for teaching and reasoning about networking in general terms. TCP/IP layers: Link, Internet, Transport, Application — less precise, but is what protocols like IP, TCP, and HTTP actually map onto in practice.',
        whyItMatters: 'You\'ll be asked to place a protocol (HTTP, TCP, IP) at the right layer — knowing both models lets you answer either framing.',
      },
      {
        name: 'TCP vs UDP',
        definition: 'TCP is a connection-oriented protocol that guarantees delivery and ordering. UDP is connectionless and makes no delivery guarantees.',
        howItWorks: 'TCP handles retransmission, ordering, and congestion control, at the cost of extra overhead and latency (the three-way handshake, acknowledgments). UDP just fires packets with no handshake or guarantee, which is why it\'s used for video streaming or gaming, where a dropped packet costs less than the delay of waiting for a retransmission.',
        example:
          '# TCP: 3-way handshake before any data flows\n' +
          'Client -> SYN -> Server\n' +
          'Client <- SYN-ACK <- Server\n' +
          'Client -> ACK -> Server\n' +
          '# UDP: no handshake, just send\n' +
          'Client -> DATA -> Server',
        whyItMatters: 'This is the most common "when would you choose X" networking question — the answer hinges on whether losing a packet is acceptable.',
      },
      {
        name: 'HTTP vs HTTPS',
        definition: 'HTTPS is HTTP layered on top of TLS encryption.',
        howItWorks: 'The data sent is functionally the same as HTTP, but TLS encrypts it in transit, preventing eavesdropping or tampering by anyone on the network path, and verifies the server\'s identity via a certificate issued by a trusted authority.',
        whyItMatters: 'Interviewers use this to check you understand that HTTPS is about transport security, not a different application protocol.',
      },
      {
        name: 'DNS Resolution Process',
        definition: 'DNS resolution is the process of turning a domain name into an IP address.',
        howItWorks: 'Your resolver asks a root server which server handles the top-level domain (like .com), then asks that TLD server which server handles the specific domain, then asks that authoritative server for the actual IP — with caching at every level so most real lookups skip straight to a cached answer instead of walking the full chain.',
        example:
          'Browser -> Recursive Resolver: "what is example.com?"\n' +
          'Resolver -> Root Server: "who handles .com?"        -> TLD server address\n' +
          'Resolver -> TLD Server: "who handles example.com?"  -> Authoritative server\n' +
          'Resolver -> Authoritative Server: "IP for example.com?" -> 93.184.x.x',
        whyItMatters: 'This comes up whenever "what happens when you type a URL into a browser" is asked — a classic opening networking question.',
      },
      {
        name: 'Load Balancing Basics',
        definition: 'A load balancer sits in front of multiple servers and distributes incoming requests among them so no single server gets overwhelmed.',
        howItWorks: 'Round robin rotates through servers evenly. Least connections sends to whichever server currently has the fewest active requests. Consistent hashing routes the same kind of request to the same server, which matters when server-side caching depends on request affinity.',
        whyItMatters: 'This bridges networking and system design — expect it to resurface when discussing scaling a service.',
      },
      {
        name: 'REST vs GraphQL',
        definition: 'REST exposes fixed endpoints that each return a fixed shape of data. GraphQL exposes a single endpoint where the client specifies exactly which fields it wants.',
        howItWorks: 'REST\'s fixed shape can mean over-fetching (getting fields you don\'t need) or under-fetching (needing multiple round trips to assemble what you actually need). GraphQL avoids both by letting the client query precisely, at the cost of more server-side complexity to support arbitrary queries efficiently.',
        example:
          '# REST: fixed shape, maybe more than you need\n' +
          'GET /users/5   -> { id, name, email, address, orders: [...] }\n\n' +
          '# GraphQL: client asks for exactly what it wants\n' +
          'query { user(id: 5) { name email } }',
        whyItMatters: 'This is really an API-design trade-off question dressed as a networking one — over/under-fetching is the key phrase interviewers listen for.',
      },
      {
        name: 'WebSockets vs HTTP Polling',
        definition: 'HTTP polling repeatedly asks the server "anything new?" on an interval. A WebSocket opens one persistent connection either side can push messages over at any time.',
        howItWorks: 'Polling wastes requests when nothing has changed, and adds latency (up to one polling interval) when something has. A WebSocket avoids both, since the server can push the moment something happens, without the client having to ask.',
        whyItMatters: 'This is the standard "how would you build real-time chat/notifications" follow-up question.',
      },
      {
        name: 'CDN — how it works',
        definition: 'A Content Delivery Network caches copies of static content on servers spread across many geographic locations.',
        howItWorks: 'A user\'s request is served from a nearby edge server instead of traveling all the way to the origin server, cutting latency and reducing load on the origin. Edge servers periodically refresh their cached copies from the origin, or get invalidated when content changes.',
        whyItMatters: 'CDNs come up in almost every "how would you scale a website" system design discussion.',
      },
    ],
  },
  {
    name: 'OOP',
    items: [
      {
        name: 'Four Pillars: Encapsulation, Abstraction, Inheritance, Polymorphism',
        definition: 'The four foundational ideas of object-oriented design.',
        howItWorks: 'Encapsulation bundles data with the methods that operate on it and restricts direct access to internal state. Abstraction exposes only what\'s necessary and hides implementation detail behind a simpler interface. Inheritance lets a class reuse and extend another class\'s behavior. Polymorphism lets different classes be used interchangeably through a shared interface, each providing its own specific behavior.',
        example:
          'class Shape { area() { throw "not implemented" } }\n' +
          'class Circle extends Shape { area() { return 3.14 * this.r * this.r } }\n' +
          'class Square extends Shape { area() { return this.side * this.side } }\n' +
          '// polymorphism: shapes.forEach(s => print(s.area())) works for any Shape subclass',
        whyItMatters: 'Nearly every OOP round opens with this — the trick is giving a concrete example for each pillar, not just the definitions.',
      },
      {
        name: 'SOLID Principles',
        definition: 'Five design guidelines for writing maintainable object-oriented code.',
        howItWorks: 'Single Responsibility: a class should have one reason to change. Open/Closed: code should be open for extension but closed for modification. Liskov Substitution: subtypes must be usable anywhere their base type is expected without breaking behavior. Interface Segregation: prefer many small, specific interfaces over one large general one. Dependency Inversion: depend on abstractions, not concrete implementations.',
        whyItMatters: 'SOLID is often tested by showing you a bad code snippet and asking which principle it violates — memorizing the names isn\'t enough.',
      },
      {
        name: 'Interface vs Abstract Class',
        definition: 'An interface declares a contract with no implementation of its own. An abstract class can provide partial implementation alongside abstract methods that subclasses must fill in.',
        howItWorks: 'A class can implement multiple interfaces, but most languages only allow inheriting from one abstract class. Use an interface for "can do this" (e.g. Comparable), an abstract class for "is a kind of this, with shared behavior" (e.g. a base Animal class with a shared eat() method).',
        whyItMatters: 'The "why would you pick one over the other" follow-up is where most people stumble — it\'s about shared implementation vs. pure contract.',
      },
      {
        name: 'Method Overloading vs Overriding',
        definition: 'Overloading defines multiple methods with the same name but different parameters in the same class. Overriding lets a subclass provide its own implementation of a method already defined in its parent.',
        howItWorks: 'Overloading is resolved at compile time based on the arguments passed. Overriding is resolved at runtime based on the actual object\'s type — this is the mechanism behind polymorphism.',
        example:
          'class Printer {\n' +
          '  print(x: number) { ... }      // overload 1\n' +
          '  print(x: string) { ... }      // overload 2 (compile-time choice)\n' +
          '}\n' +
          'class ColorPrinter extends Printer {\n' +
          '  print(x: number) { ... }      // override (runtime choice)\n' +
          '}',
        whyItMatters: 'Compile-time vs. runtime resolution is the exact distinction interviewers check for here.',
      },
      {
        name: 'Composition vs Inheritance',
        definition: 'Inheritance models an "is-a" relationship (a Dog is an Animal). Composition models a "has-a" relationship (a Car has an Engine) by building objects out of other objects.',
        howItWorks: 'Inheritance can create tight coupling that\'s hard to change later, since a subclass depends on its parent\'s internals. Composition tends to be more flexible, since components can be swapped out independently — a common guideline is to favor composition over inheritance when either would work.',
        whyItMatters: 'This is a classic design-judgment question — the "favor composition" guideline is what most interviewers are listening for.',
      },
      {
        name: 'Common Design Patterns',
        definition: 'Reusable solutions to recurring design problems.',
        howItWorks: 'Singleton ensures a class has only one instance, globally accessible — useful for shared resources like config, though overuse can hide dependencies. Factory delegates object creation to a separate method or class, decoupling code from the concrete classes it needs to instantiate. Observer lets objects subscribe to and get notified of another object\'s state changes — the basis of most event-driven and pub/sub systems.',
        example:
          '// Observer pattern\n' +
          'class Subject {\n' +
          '  observers = []\n' +
          '  subscribe(fn) { this.observers.push(fn) }\n' +
          '  notify(data) { this.observers.forEach(fn => fn(data)) }\n' +
          '}',
        whyItMatters: 'Being able to name the pattern in code you\'re shown (not just recite pattern names) is what this question is really testing.',
      },
      {
        name: 'Static vs Dynamic Binding',
        definition: 'Static binding resolves which method to call at compile time. Dynamic binding resolves it at runtime.',
        howItWorks: 'Static binding is based on the declared type of a reference — this is how overloaded methods are resolved. Dynamic binding is based on the actual object\'s type at runtime — this is how overridden methods achieve polymorphism.',
        whyItMatters: 'This is the underlying mechanism behind the overloading-vs-overriding question — expect them paired together.',
      },
      {
        name: 'Constructor vs Destructor',
        definition: 'A constructor runs when an object is created, typically to initialize its state. A destructor runs when an object is destroyed, typically to release resources it held.',
        howItWorks: 'Languages with manual memory management (like C++) expose deterministic destructors. Languages with garbage collection (Java, JavaScript) usually don\'t — cleanup instead relies on patterns like try-with-resources or explicit dispose methods, since you can\'t predict exactly when the GC will reclaim an object.',
        whyItMatters: 'This is often used to check whether you understand garbage collection\'s trade-offs, not just constructor/destructor syntax.',
      },
    ],
  },
];

export const SYSDESIGN_TOPICS: ConceptTopic[] = [
  {
    name: 'Core Building Blocks',
    items: [
      {
        name: 'Vertical vs Horizontal Scaling',
        definition: 'Vertical scaling makes a single machine more powerful. Horizontal scaling adds more machines and distributes load across them.',
        howItWorks: 'Vertical scaling is simple but has a hard ceiling (there\'s a biggest machine you can buy) and a single point of failure. Horizontal scaling scales further and adds redundancy, but requires the system to be designed for distributed operation — stateless services, and data that\'s shared or partitioned rather than sitting on one machine.',
        whyItMatters: 'Almost every system design interview starts by establishing which axis you\'re scaling on, since it shapes every later decision.',
      },
      {
        name: 'Load Balancing Strategies',
        definition: 'Algorithms a load balancer uses to decide which server handles the next request.',
        howItWorks: 'Round robin distributes requests evenly regardless of server load. Least connections routes to whichever server currently has the fewest active requests, adapting better to uneven request costs. Consistent hashing routes the same kind of request to the same server consistently, which matters when a server holds request-specific cached state.',
        whyItMatters: 'Picking the right strategy for a given scenario (stateless vs. stateful servers) is the actual point of this question.',
      },
      {
        name: 'Caching Strategies',
        definition: 'Patterns for keeping a cache in sync with the underlying data store.',
        howItWorks: 'Cache-aside: the application checks the cache first, and on a miss, reads from the database and populates the cache itself. Write-through: every write goes to the cache and database together, keeping them always in sync at the cost of write latency. Write-back: writes go to the cache first and are flushed to the database later — fast, but risks data loss if the cache fails before flushing.',
        example:
          '# cache-aside read\n' +
          'value = cache.get(key)\n' +
          'if value is None:\n' +
          '    value = db.query(key)\n' +
          '    cache.set(key, value)\n' +
          'return value',
        whyItMatters: 'Caching strategy questions test whether you understand the consistency-vs-performance trade-off, not just "add a cache."',
      },
      {
        name: 'Database Sharding',
        definition: 'Sharding splits a large dataset across multiple database instances, each responsible for a subset of the data.',
        howItWorks: 'Data is typically split by a key range or a hash of the key. This scales storage and write throughput beyond what one machine can handle, but cross-shard queries and transactions become significantly harder to implement correctly, since they now span multiple independent databases.',
        whyItMatters: 'This is where most system design answers get vague — a strong answer names the sharding key and admits the cross-shard query cost.',
      },
      {
        name: 'Consistent Hashing',
        definition: 'A hashing scheme that maps both servers and data onto the same conceptual ring, so each piece of data is owned by the nearest server clockwise on the ring.',
        howItWorks: 'When a server is added or removed, only the data between it and its neighbor needs to move, instead of reshuffling everything — which is what makes it far more resilient to scaling changes than simple modulo-based hashing (where adding one server remaps almost everything).',
        example:
          '# hash both servers and keys onto a ring 0..359\n' +
          'servers_on_ring = { hash(S1): S1, hash(S2): S2, hash(S3): S3 }\n' +
          'def owner(key):\n' +
          '    h = hash(key)\n' +
          '    return next server clockwise from h on the ring',
        whyItMatters: 'This is the standard follow-up whenever sharding or distributed caching comes up — it explains why adding a node doesn\'t reshuffle everything.',
      },
      {
        name: 'Message Queues',
        definition: 'A message queue (like Kafka or RabbitMQ) decouples producers of work from consumers of that work.',
        howItWorks: 'A producer drops a message on the queue and moves on; consumers process messages independently at their own pace. This smooths out traffic spikes, lets services fail and recover without losing work, and lets you scale producers and consumers separately.',
        whyItMatters: 'Queues are the default answer to "how do you make this system resilient to spikes/failures" in system design rounds.',
      },
      {
        name: 'Rate Limiting Algorithms',
        definition: 'Algorithms that cap how many requests a client can make in a given time window.',
        howItWorks: 'Token bucket allows bursts up to a bucket\'s capacity while refilling tokens at a steady rate — common for balancing burstiness with an average rate limit. Sliding window log tracks exact request timestamps in a rolling window, giving precise limiting at the cost of more memory. Fixed window is simplest (count requests per fixed time block) but allows bursts right at window boundaries.',
        example:
          '# token bucket\n' +
          'tokens = capacity\n' +
          'on request:\n' +
          '    refill tokens based on elapsed time (up to capacity)\n' +
          '    if tokens >= 1: tokens -= 1; allow\n' +
          '    else: reject',
        whyItMatters: '"Design a rate limiter" is one of the most commonly asked system design questions outright.',
      },
      {
        name: 'CAP Theorem Trade-offs',
        definition: 'When a network partition happens, a distributed system must choose between staying consistent or staying available.',
        howItWorks: 'Staying consistent means rejecting some requests to avoid serving stale data. Staying available means serving requests even if the data might be slightly stale. Most real systems pick a point along that spectrum per use case (e.g. per-endpoint) rather than treating it as one absolute binary choice for the whole system.',
        whyItMatters: 'Interviewers want you to apply CAP to your specific design ("this endpoint favors availability because...") rather than just define it.',
      },
    ],
  },
  {
    name: 'Common Case Studies',
    items: [
      {
        name: 'Design a URL Shortener',
        definition: 'A service that maps a long URL to a short, unique key and redirects visitors from the short key back to the original.',
        howItWorks: 'Generate a short unique key (via a counter, hash, or random string with a collision check) for each long URL, store the mapping in a fast key-value store, and redirect on lookup. Worth discussing: how to handle key collisions, whether to support custom aliases, and how to scale reads (which vastly outnumber writes) with caching.',
        whyItMatters: 'This is the "hello world" of system design interviews — a strong answer covers key generation, storage, and read-scaling in that order.',
      },
      {
        name: 'Design a Twitter-like Feed',
        definition: 'A system that shows each user a personalized feed of posts from accounts they follow.',
        howItWorks: 'Fan-out on write pushes new posts to every follower\'s feed immediately at post time — fast reads, but expensive for users with huge followings. Fan-out on read assembles the feed when requested — cheaper to write, slower to read. Most real systems use a hybrid: push for typical users, pull for celebrity accounts with huge follower counts.',
        whyItMatters: 'The fan-out trade-off, and knowing the hybrid answer, is exactly what separates a strong answer from a basic one here.',
      },
      {
        name: 'Design a Chat Application',
        definition: 'A system for real-time messaging between users, individually or in groups.',
        howItWorks: 'Persistent WebSocket connections handle real-time delivery. A message queue or pub/sub layer routes messages between users, especially across multiple server instances (since a WebSocket connection lives on one specific server). A database stores message history. Worth discussing: offline delivery, read receipts, and group chats at scale.',
        whyItMatters: 'This tests whether you know WebSockets alone aren\'t enough at scale — you need a routing layer across server instances.',
      },
      {
        name: 'Design an E-commerce Cart & Checkout',
        definition: 'A system for holding items a user intends to buy, then completing payment and order creation.',
        howItWorks: 'The cart itself can live in a fast key-value store keyed by user/session. Checkout needs strong transactional guarantees — inventory decrement, payment, and order creation should either all succeed or all roll back. Worth discussing: preventing overselling limited stock under concurrent checkouts, and handling payment failures gracefully.',
        whyItMatters: 'This checks whether you know where strong consistency actually matters (checkout) versus where it doesn\'t (the cart).',
      },
      {
        name: 'Design a Rate Limiter',
        definition: 'A system-level version of the rate-limiting algorithm question — how to enforce limits consistently across a whole fleet of servers.',
        howItWorks: 'Pick an algorithm (token bucket is common), and decide where state lives — in-memory per server is fast but inconsistent across a fleet, so a shared store like Redis is typically used to enforce limits consistently across all servers handling a given user\'s requests.',
        whyItMatters: 'The "where does the counter live" question is the actual system-design layer on top of the algorithm question.',
      },
      {
        name: 'Design a Notification System',
        definition: 'A system that delivers notifications to users across channels like push, email, and SMS.',
        howItWorks: 'A queue-based pipeline: an event triggers a notification job, which is routed to the right delivery channel, with retries for failed deliveries and rate limiting per user to avoid overwhelming them. Worth discussing: deduplicating notifications and respecting user preferences per channel.',
        whyItMatters: 'This tests whether you default to a queue-based, retry-capable design rather than a synchronous "just send it" approach.',
      },
      {
        name: 'Design a Video Streaming Service',
        definition: 'A system for uploading, processing, and streaming video to many users with varying connection speeds.',
        howItWorks: 'Videos are transcoded into multiple resolutions/bitrates ahead of time, split into small chunks, and served through a CDN so users stream from a nearby edge server with adaptive bitrate switching based on their connection speed. Worth discussing: how upload/transcoding pipelines scale, and how metadata (views, recommendations) is served separately from the actual video bytes.',
        whyItMatters: 'The key insight tested here is separating the heavy, cacheable video bytes from the lightweight, frequently-changing metadata.',
      },
      {
        name: 'Design an API Gateway',
        definition: 'A single entry point in front of multiple backend services.',
        howItWorks: 'It handles cross-cutting concerns — authentication, rate limiting, request routing, and sometimes response aggregation — so individual services don\'t each need to reimplement them. Worth discussing: how it avoids becoming a single point of failure or a bottleneck itself (redundancy, horizontal scaling of the gateway layer).',
        whyItMatters: 'This tests whether you can name concrete cross-cutting concerns, not just say "it routes requests."',
      },
    ],
  },
];

export const WEB_TOPICS: ConceptTopic[] = [
  {
    name: 'JavaScript Core',
    items: [
      {
        name: 'Closures',
        definition: 'A closure is a function that remembers the variables from the scope it was created in, even after that outer scope has finished executing.',
        howItWorks: 'When a function is defined inside another function, it keeps a reference to its enclosing scope\'s variables. This is how you get private state in JavaScript without classes — an inner function can keep referencing and modifying a variable that\'s otherwise inaccessible from outside.',
        example:
          'function makeCounter() {\n' +
          '  let count = 0;\n' +
          '  return () => ++count;   // closes over `count`\n' +
          '}\n' +
          'const counter = makeCounter();\n' +
          'counter(); // 1\n' +
          'counter(); // 2',
        whyItMatters: 'Closures are the mechanism behind private state, memoization, and most React hooks — one of the highest-value JS concepts to actually understand.',
      },
      {
        name: 'Event Loop & Call Stack',
        definition: 'JavaScript runs on a single thread with a call stack for currently executing code; the event loop is what lets it still handle asynchronous work.',
        howItWorks: 'Asynchronous work (timers, network calls) is handed off to the browser/runtime, and its callback is queued once ready. The event loop continuously checks: is the call stack empty? If so, take the next queued callback and push it onto the stack. This is why `setTimeout(fn, 0)` still runs after all currently synchronous code finishes.',
        example:
          'console.log("1");\n' +
          'setTimeout(() => console.log("2"), 0);\n' +
          'console.log("3");\n' +
          '// logs: 1, 3, 2 — the timeout callback waits for the stack to empty first',
        whyItMatters: 'This explains almost every "why did my code run in this order" JavaScript question you\'ll ever debug.',
      },
      {
        name: 'Promises vs Async/Await',
        definition: 'A Promise represents a value that will be available later (or an error). Async/await is syntax sugar over Promises that lets asynchronous code read like synchronous code.',
        howItWorks: 'A Promise uses `.then()`/`.catch()` to react to eventual success or failure. `await` pauses the function until the Promise resolves, without blocking the rest of the program — under the hood it\'s still the same Promise machinery, just written differently.',
        example:
          '// Promise style\n' +
          'fetch(url).then(res => res.json()).then(data => use(data)).catch(handleErr);\n\n' +
          '// async/await style, same behavior\n' +
          'try {\n' +
          '  const res = await fetch(url);\n' +
          '  const data = await res.json();\n' +
          '  use(data);\n' +
          '} catch (err) { handleErr(err); }',
        whyItMatters: 'Being asked to convert between the two styles (or explain why async/await needs try/catch) is a very common live-coding check.',
      },
      {
        name: 'Hoisting',
        definition: 'Variable and function declarations are conceptually moved to the top of their scope before code executes.',
        howItWorks: '`var` declarations are hoisted and initialized as `undefined`. `let`/`const` are hoisted but stay in an inaccessible "temporal dead zone" until their actual line runs — accessing them earlier throws, rather than returning `undefined`. Function declarations (not expressions) are hoisted along with their full body, so they can be called before their line in the file.',
        example:
          'console.log(a); // undefined (var is hoisted, not the value)\n' +
          'var a = 5;\n\n' +
          'console.log(b); // ReferenceError — temporal dead zone\n' +
          'let b = 5;',
        whyItMatters: 'This explains a class of confusing bugs around `var` vs `let`/`const` that interviewers use to check real understanding, not memorized rules.',
      },
      {
        name: "'this' keyword behavior",
        definition: 'The value of `this` depends on how a function is called, not where it\'s defined.',
        howItWorks: 'Called as a method (`obj.fn()`), `this` is the object. Called standalone, `this` is `undefined` (strict mode) or the global object. Arrow functions don\'t have their own `this` at all — they inherit it from the enclosing scope where they were defined, which is why they\'re often used to avoid `this` confusion inside callbacks.',
        example:
          'const obj = {\n' +
          '  name: "A",\n' +
          '  regular() { return this.name; },      // "A" — obj.regular() called as method\n' +
          '  arrow: () => this.name,                // undefined — inherits outer `this`\n' +
          '};',
        whyItMatters: 'This is one of the most-asked JS gotchas — expect a code snippet and a "what does this log" question.',
      },
      {
        name: 'Prototypal Inheritance',
        definition: 'Every JavaScript object has an internal link to another object (its prototype); property lookups that miss on the object itself continue up that prototype chain.',
        howItWorks: 'This is different from classical inheritance — objects inherit directly from other objects, rather than from a class blueprint, even though `class` syntax is mostly sugar over this same mechanism under the hood.',
        example:
          'const animal = { eats: true };\n' +
          'const rabbit = Object.create(animal);\n' +
          'rabbit.hops = true;\n' +
          'rabbit.eats; // true — found via the prototype chain, not on rabbit itself',
        whyItMatters: 'Understanding this is what lets you correctly answer "how does `class` actually work under the hood" follow-ups.',
      },
      {
        name: 'Debounce vs Throttle',
        definition: 'Debounce delays running a function until a certain time has passed since the last call. Throttle ensures a function runs at most once per fixed interval.',
        howItWorks: 'Debounce is useful for something like a search-as-you-type box, where you only want to fire once the user pauses. Throttle is useful for something like a scroll handler that shouldn\'t fire on every single pixel of scroll, but should still fire periodically while scrolling continues.',
        example:
          'function debounce(fn, wait) {\n' +
          '  let t;\n' +
          '  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };\n' +
          '}',
        whyItMatters: 'Implementing debounce from scratch is a very common live-coding exercise, not just a definitions question.',
      },
      {
        name: '== vs ===',
        definition: '`===` compares both value and type with no conversion. `==` performs type coercion before comparing.',
        howItWorks: 'Coercion in `==` can produce surprising results, like `"" == 0` being `true` because both get coerced to a common type before comparing. The near-universal advice is to always use `===` and only reach for `==` in the rare case you deliberately want the coercion.',
        example:
          '"" == 0        // true  (coerced)\n' +
          '"" === 0       // false (different types, no coercion)\n' +
          'null == undefined  // true\n' +
          'null === undefined // false',
        whyItMatters: 'Interviewers use this to probe whether you understand type coercion, not just "always use triple equals" as a rule with no reasoning.',
      },
    ],
  },
  {
    name: 'React',
    items: [
      {
        name: 'Virtual DOM & Reconciliation',
        definition: 'React keeps an in-memory representation of the UI (the virtual DOM) and, on a state change, computes a new virtual DOM tree to figure out the minimal real DOM change needed.',
        howItWorks: 'React diffs the new virtual DOM tree against the previous one ("reconciliation") to find exactly what changed, then applies only those minimal changes to the real DOM — since touching the real DOM directly is comparatively expensive, this is what makes updates fast.',
        whyItMatters: 'This explains *why* React is fast, not just *that* it is — a common follow-up is "when would the virtual DOM not help."',
      },
      {
        name: 'useState vs useEffect',
        definition: '`useState` gives a component local state that persists across re-renders. `useEffect` runs side effects after render.',
        howItWorks: '`useState` triggers a re-render when its setter is called. `useEffect` handles data fetching, subscriptions, or manual DOM work after render, and can clean up after itself when the component unmounts or before the effect re-runs — it\'s the hook-based replacement for lifecycle methods like componentDidMount/componentDidUpdate/componentWillUnmount.',
        example:
          'function Timer() {\n' +
          '  const [count, setCount] = useState(0);\n' +
          '  useEffect(() => {\n' +
          '    const id = setInterval(() => setCount(c => c + 1), 1000);\n' +
          '    return () => clearInterval(id); // cleanup on unmount\n' +
          '  }, []);\n' +
          '  return count;\n' +
          '}',
        whyItMatters: 'The dependency array and cleanup function are where most real useEffect bugs (stale closures, missed cleanup) come from — expect a debugging-style question.',
      },
      {
        name: 'Component Lifecycle (class & hooks)',
        definition: 'The sequence of phases a component goes through: mounting, updating, and unmounting.',
        howItWorks: 'Class components use named methods: `componentDidMount` (after first render), `componentDidUpdate` (after subsequent renders), `componentWillUnmount` (before removal). Function components achieve the same behavior with `useEffect`, where the dependency array controls when it re-runs, and the returned cleanup function handles the unmount case.',
        whyItMatters: 'Being able to map old class lifecycle methods to their hook equivalent is common when working with a mixed/legacy codebase.',
      },
      {
        name: 'Controlled vs Uncontrolled Components',
        definition: 'A controlled input has its value driven entirely by React state. An uncontrolled input manages its own value internally in the DOM.',
        howItWorks: 'A controlled input reads its value from state and updates it via an `onChange` handler on every keystroke. An uncontrolled input\'s value lives in the DOM itself, and you read it on demand (e.g. via a ref) rather than syncing every keystroke through React.',
        example:
          '// controlled\n' +
          '<input value={value} onChange={e => setValue(e.target.value)} />\n\n' +
          '// uncontrolled\n' +
          '<input ref={inputRef} defaultValue="hi" />\n' +
          '// later: inputRef.current.value',
        whyItMatters: 'Forms are one of the most common "build this feature" exercises, and this distinction determines the whole approach.',
      },
      {
        name: 'Props vs State',
        definition: 'Props are read-only data passed down from a parent. State is data owned and managed internally by a component.',
        howItWorks: 'A component can\'t modify its own props — they flow down from the parent. State can be updated by the component itself, triggering a re-render. State changes stay local unless explicitly lifted up to a parent or passed down further as props.',
        whyItMatters: 'This underlies "lifting state up," a core React pattern interviewers expect you to reach for when two sibling components need to share data.',
      },
      {
        name: 'Why Keys Matter in Lists',
        definition: 'Keys tell React which items in a list correspond to which items after a re-render.',
        howItWorks: 'With stable keys, React can correctly reuse, reorder, or remove DOM elements instead of tearing everything down and rebuilding it. Using an unstable key (like an array index for a reorderable list) can cause React to mismatch items to the wrong DOM node, leading to bugs with component state or focus landing on the wrong row.',
        example:
          '// bad for a reorderable list — index changes when items reorder\n' +
          'items.map((item, i) => <Row key={i} {...item} />)\n\n' +
          '// good — stable identity regardless of position\n' +
          'items.map(item => <Row key={item.id} {...item} />)',
        whyItMatters: 'The "index as key" mistake is extremely common in real codebases, which is exactly why interviewers probe for it.',
      },
      {
        name: 'Context API',
        definition: 'Context lets you pass data down through a component tree without manually threading props through every intermediate level ("prop drilling").',
        howItWorks: 'A `Provider` makes a value available; any descendant component can read it via `useContext`, no matter how deep it is in the tree. It\'s useful for things like theme, auth state, or locale that many components need access to without a chain of prop-passing.',
        whyItMatters: 'The usual follow-up is "when would you use Context vs. a state management library" — Context suits infrequently-changing, broadly-needed values.',
      },
      {
        name: 'Writing Custom Hooks',
        definition: 'A custom hook is a regular function whose name starts with `use` that calls other hooks internally.',
        howItWorks: 'It lets you extract and reuse stateful logic across components — for example, a `useFetch(url)` hook that handles loading/error/data state, so multiple components can fetch data without duplicating that logic.',
        example:
          'function useFetch(url) {\n' +
          '  const [data, setData] = useState(null);\n' +
          '  useEffect(() => { fetch(url).then(r => r.json()).then(setData); }, [url]);\n' +
          '  return data;\n' +
          '}',
        whyItMatters: 'Writing one live is a common exercise — it tests whether you understand hooks compose, rather than being magic React-only syntax.',
      },
    ],
  },
  {
    name: 'Node.js & APIs',
    items: [
      {
        name: 'REST API Design Principles',
        definition: 'REST models a system as resources (nouns), accessed via standard HTTP verbs.',
        howItWorks: 'GET reads, POST creates, PUT/PATCH updates, DELETE removes — with URLs identifying resources rather than actions (`/users/5` rather than `/getUser?id=5`). Being stateless — each request carries everything needed to process it, with no server-side session — is a core REST constraint that makes horizontal scaling easier, since any server can handle any request.',
        example:
          'GET    /users/5      # read\n' +
          'POST   /users        # create\n' +
          'PATCH  /users/5      # partial update\n' +
          'DELETE /users/5      # remove',
        whyItMatters: 'This is often tested by handing you a bad API design and asking you to identify what\'s wrong with it (verb in the URL, non-idempotent GET, etc.).',
      },
      {
        name: 'Middleware in Express',
        definition: 'Functions that sit in the request-handling pipeline, each able to inspect or modify the request/response.',
        howItWorks: 'A middleware function either passes control to the next middleware (`next()`) or ends the response. This is how cross-cutting concerns like logging, authentication, and error handling get applied without duplicating that logic inside every individual route handler.',
        example:
          'function requireAuth(req, res, next) {\n' +
          '  if (!req.headers.authorization) return res.status(401).end();\n' +
          '  next(); // pass control to the next middleware/route\n' +
          '}\n' +
          'app.get("/private", requireAuth, handler);',
        whyItMatters: 'Middleware ordering bugs (auth check placed after the route handler, for example) are a common debugging-style question.',
      },
      {
        name: 'Authentication — JWT vs Sessions',
        definition: 'Session-based auth stores session data server-side. JWT-based auth encodes the user\'s claims directly into a signed token the client holds.',
        howItWorks: 'Sessions give the client just an opaque session ID cookie — easy to revoke, but requires shared session storage across server instances. JWTs let any server verify the token without a shared store, but revoking a single JWT before it expires is much harder since the server isn\'t tracking it anywhere.',
        whyItMatters: 'The revocation trade-off is the key insight interviewers want — JWTs "scale better" but are harder to invalidate early.',
      },
      {
        name: 'CORS',
        definition: 'Cross-Origin Resource Sharing is a browser security mechanism that blocks a webpage from making requests to a different origin than it was loaded from, unless explicitly allowed.',
        howItWorks: 'The target server allows cross-origin requests via response headers like `Access-Control-Allow-Origin`. It\'s a client-side (browser) restriction — a server can still be reached fine by tools like curl, since CORS is enforced by the browser, not the server itself.',
        whyItMatters: 'This clears up a very common misconception — CORS errors mean the browser blocked the response, not that the server rejected the request.',
      },
      {
        name: 'Node.js Event Loop',
        definition: 'Node runs JavaScript on a single thread but delegates I/O operations to the underlying system so the main thread isn\'t blocked waiting for them.',
        howItWorks: 'File reads and network calls are handed off to the system (via libuv). When an I/O operation completes, its callback is queued to run on the main thread once it\'s free. This is what lets Node handle many concurrent connections efficiently despite being single-threaded for JS execution itself.',
        whyItMatters: 'This is the mechanism behind "Node handles concurrency well despite being single-threaded" — a frequent point of confusion worth explaining precisely.',
      },
      {
        name: 'Preventing SQL Injection',
        definition: 'SQL injection happens when untrusted user input is directly concatenated into a SQL query string, letting an attacker inject their own SQL logic.',
        howItWorks: 'The fix is parameterized queries (or prepared statements), where user input is passed as a separate bound parameter rather than being concatenated into the query text — the database engine never interprets it as SQL syntax, no matter what the input contains.',
        example:
          '// vulnerable\n' +
          'db.query(`SELECT * FROM users WHERE name = \'${input}\'`);\n\n' +
          '// safe — parameterized\n' +
          'db.query("SELECT * FROM users WHERE name = ?", [input]);',
        whyItMatters: 'This is a foundational security question — the expected answer is specifically "parameterized queries," not just "sanitize input."',
      },
      {
        name: 'API Rate Limiting',
        definition: 'Capping how many requests a client can make in a given time window, protecting an API from abuse or accidental overload.',
        howItWorks: 'Typically implemented with an algorithm like token bucket or sliding window, tracked in a shared store (like Redis) if the API runs across multiple server instances, so limits are enforced consistently regardless of which instance handles a given request.',
        whyItMatters: 'This is the same problem as "Design a Rate Limiter" in system design, just scoped to the API layer specifically.',
      },
      {
        name: 'Microservices vs Monolith',
        definition: 'A monolith is one deployable application containing all functionality. Microservices split functionality into independently deployable services communicating over the network.',
        howItWorks: 'A monolith is simpler to develop and deploy initially, but can become unwieldy as it grows, and forces the whole thing to scale together. Microservices allow independent scaling and deployment, at the cost of significantly more operational complexity — network calls, distributed data consistency, and service discovery all become real concerns.',
        whyItMatters: 'The expected answer is nuanced trade-offs, not "microservices are always better" — interviewers specifically listen for the added operational cost.',
      },
    ],
  },
];

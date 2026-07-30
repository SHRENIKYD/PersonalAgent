import { ConceptTopic } from './models';

/**
 * Java notes, beginner to advanced — theory, syntax, and a plain-English explanation for
 * each concept, same shell as CS Fundamentals/System Design/Web (PrepConceptComponent).
 * Ordered so each topic builds roughly from fundamentals toward more advanced material.
 */
export const JAVA_TOPICS: ConceptTopic[] = [
  {
    name: 'Java Basics & Syntax',
    items: [
      {
        name: 'Variables, Types & Type Conversion',
        definition: 'Java is statically typed — every variable is declared with a fixed type (int, double, boolean, String, ...) that never changes for that variable.',
        howItWorks: 'Primitive types (int, long, double, char, boolean, byte, short, float) store raw values directly. Everything else (String, arrays, objects) is a reference type, storing a pointer to the actual data on the heap. Widening conversion (int -> long -> double) happens automatically; narrowing (double -> int) needs an explicit cast and can lose precision.',
        example:
          'int a = 5;\n' +
          'double b = a;        // widening, automatic\n' +
          'int c = (int) 5.9;   // narrowing, explicit cast -> 5 (truncated, not rounded)',
        whyItMatters: 'Confusing primitives with reference types is the single most common source of early Java bugs (like using == to compare String content).',
      },
      {
        name: 'Control Flow (if/switch/loops)',
        definition: 'The standard branching and looping constructs: if/else, switch, for, while, do-while, and the enhanced for-each loop.',
        howItWorks: 'A modern switch can use arrow syntax (case X -> ...) which doesn\'t fall through by default, unlike the classic colon syntax where execution falls into the next case unless you break. The for-each loop (for (Type x : collection)) is the default choice for reading a collection without needing the index.',
        example:
          'switch (day) {\n' +
          '  case MONDAY, FRIDAY -> System.out.println("busy");\n' +
          '  case SATURDAY, SUNDAY -> System.out.println("rest");\n' +
          '  default -> System.out.println("normal");\n' +
          '}',
        whyItMatters: 'Forgetting break in classic switch statements is a classic interview gotcha and a real production bug source.',
      },
      {
        name: 'Arrays',
        definition: 'A fixed-size, ordered collection of elements of the same type, indexed from 0.',
        howItWorks: 'Once created, an array\'s length cannot change — "resizing" actually means creating a new array and copying elements over (which is what ArrayList does internally). Arrays of objects hold references, not copies, so mutating an element through one reference is visible through any other reference to the same array.',
        example:
          'int[] nums = {1, 2, 3};\n' +
          'int[][] grid = new int[3][3];  // 3x3, all zeros',
        whyItMatters: 'Understanding that arrays are fixed-size is what makes ArrayList\'s resizing behavior (and its amortized O(1) add) make sense later.',
      },
      {
        name: 'Methods & Overloading',
        definition: 'A method is a named block of reusable code; overloading means multiple methods share a name but differ in parameter types or count.',
        howItWorks: 'The compiler picks which overload to call based on the argument types at compile time (static/early binding) — this is different from overriding, which is resolved at runtime based on the actual object type.',
        example:
          'void print(int x) { ... }\n' +
          'void print(String x) { ... }\n' +
          'print(5);       // calls the int version\n' +
          'print("hi");    // calls the String version',
        whyItMatters: 'This sets up the overloading-vs-overriding distinction that\'s a near-universal Java/OOP interview question.',
      },
      {
        name: 'String vs StringBuilder',
        definition: 'String is immutable — every "modification" actually creates a new String object. StringBuilder is mutable and built for efficient repeated modification.',
        howItWorks: 'Concatenating strings in a loop with + silently creates a new String object on every iteration, which is O(n) per append and O(n^2) overall for n appends. StringBuilder.append() modifies an internal buffer in place, making repeated appends O(1) amortized each.',
        example:
          '// slow for many iterations\n' +
          'String s = "";\n' +
          'for (int i = 0; i < 1000; i++) s += i;\n\n' +
          '// fast\n' +
          'StringBuilder sb = new StringBuilder();\n' +
          'for (int i = 0; i < 1000; i++) sb.append(i);\n' +
          'String result = sb.toString();',
        whyItMatters: 'This is a real performance issue people ship to production, not just a trivia question — expect it to come up when discussing String internals.',
      },
    ],
  },
  {
    name: 'OOP in Java',
    items: [
      {
        name: 'Classes, Objects & Constructors',
        definition: 'A class is a blueprint; an object is an instance of that blueprint. A constructor initializes a new object\'s state when it\'s created.',
        howItWorks: 'If you don\'t define any constructor, Java provides a no-argument default constructor for free — but the moment you define any constructor yourself, that free default disappears, so you must explicitly add a no-arg one if you still want it.',
        example:
          'class Point {\n' +
          '  int x, y;\n' +
          '  Point(int x, int y) { this.x = x; this.y = y; }\n' +
          '}\n' +
          'Point p = new Point(3, 4);',
        whyItMatters: 'The "disappearing default constructor" rule is a common early-Java surprise, and a frequent source of a confusing compile error.',
      },
      {
        name: 'Inheritance & super',
        definition: 'A subclass (extends) inherits fields and methods from a superclass; super refers to the superclass\'s version of a method or its constructor.',
        howItWorks: 'Java only allows single inheritance of classes (one extends), unlike interfaces which can be implemented in any number. super(...) as the first line of a constructor calls the parent\'s constructor; super.method() calls the parent\'s version of an overridden method.',
        example:
          'class Animal { void speak() { System.out.println("..."); } }\n' +
          'class Dog extends Animal {\n' +
          '  void speak() { super.speak(); System.out.println("Woof"); }\n' +
          '}',
        whyItMatters: 'Interviewers use this to check whether you understand Java deliberately avoids multiple class inheritance (the "diamond problem") while still allowing it for interfaces.',
      },
      {
        name: 'Abstract Classes & Interfaces',
        definition: 'An abstract class can have both implemented and unimplemented (abstract) methods, and cannot be instantiated directly. An interface declares a contract, and since Java 8 can also have default and static methods.',
        howItWorks: 'A class can extend only one abstract class but implement any number of interfaces. Use an abstract class when subclasses share real implementation; use an interface when unrelated classes just need to guarantee the same capability.',
        example:
          'interface Flyable { void fly(); default void land() { System.out.println("landed"); } }\n' +
          'abstract class Bird { abstract void eat(); void sleep() { System.out.println("zzz"); } }',
        whyItMatters: 'Java 8\'s default methods blurred the old "interfaces have zero implementation" rule — a common up-to-date follow-up question.',
      },
      {
        name: 'Polymorphism & Dynamic Dispatch',
        definition: 'The ability to treat different subclasses through a shared supertype reference, with the actual method that runs determined by the object\'s real type at runtime.',
        howItWorks: 'A variable declared as the supertype can point to any subtype instance; calling an overridden method on it runs the subtype\'s version, not the declared type\'s — this is dynamic (virtual) dispatch.',
        example:
          'Animal a = new Dog();\n' +
          'a.speak();  // runs Dog\'s speak(), not Animal\'s, even though a is typed as Animal',
        whyItMatters: 'This is the mechanism that makes design patterns like Strategy and Observer actually work under the hood.',
      },
      {
        name: 'equals() and hashCode()',
        definition: 'equals() defines when two objects should be considered logically equal; hashCode() returns an integer used to bucket objects in hash-based collections.',
        howItWorks: 'The contract requires: if two objects are equal(), they must have the same hashCode() (the reverse isn\'t required). Breaking this contract — overriding equals() without overriding hashCode() to match — causes objects to "disappear" from HashSet/HashMap because they get hashed into the wrong bucket.',
        example:
          '@Override public boolean equals(Object o) { ... }\n' +
          '@Override public int hashCode() { return Objects.hash(field1, field2); }',
        whyItMatters: 'This is a genuinely common production bug (objects vanishing from a HashSet) and a frequent Java-specific interview question.',
      },
      {
        name: 'Access Modifiers',
        definition: 'public, protected, (package-private, no keyword), and private control what code outside a class can see.',
        howItWorks: 'public is visible everywhere. protected is visible in the same package plus subclasses elsewhere. Package-private (default, no modifier) is visible only within the same package. private is visible only within the declaring class itself.',
        whyItMatters: 'Encapsulation in Java is enforced by these keywords directly, not by convention — expect a question distinguishing protected from package-private specifically.',
      },
    ],
  },
  {
    name: 'Collections Framework',
    items: [
      {
        name: 'List: ArrayList vs LinkedList',
        definition: 'ArrayList is backed by a resizable array; LinkedList is backed by a doubly linked list.',
        howItWorks: 'ArrayList gives O(1) random access (get(i)) but O(n) insertion/removal in the middle (shifting elements). LinkedList gives O(1) insertion/removal once you have a reference to the node, but O(n) random access (must walk from an end). In practice ArrayList is the default choice unless you specifically need frequent insert/remove at arbitrary positions.',
        example:
          'List<Integer> list = new ArrayList<>();\n' +
          'list.add(5); list.get(0);   // O(1) access',
        whyItMatters: 'Picking the wrong one for the access pattern is a classic performance mistake interviewers probe for.',
      },
      {
        name: 'Set: HashSet vs TreeSet vs LinkedHashSet',
        definition: 'All three store unique elements with no duplicates, differing in ordering guarantees.',
        howItWorks: 'HashSet gives no ordering guarantee at all, but O(1) average add/contains. TreeSet keeps elements in sorted order (via a red-black tree), at O(log n) per operation. LinkedHashSet preserves insertion order while keeping HashSet\'s O(1) average performance.',
        whyItMatters: 'Choosing based on whether you need order (and what kind) versus raw speed is exactly the trade-off interviewers want you to articulate.',
      },
      {
        name: 'Map: HashMap vs TreeMap vs LinkedHashMap',
        definition: 'Key-value stores with the same three-way ordering trade-off as the Set family.',
        howItWorks: 'HashMap: no ordering, O(1) average get/put. TreeMap: keys kept sorted, O(log n) per operation, useful when you need range queries or sorted iteration. LinkedHashMap: preserves insertion (or access) order with HashMap-like performance — commonly used to build a simple LRU cache by overriding removeEldestEntry.',
        example:
          'Map<String,Integer> m = new HashMap<>();\n' +
          'm.put("a", 1);\n' +
          'm.getOrDefault("b", 0);  // 0, no exception',
        whyItMatters: 'LinkedHashMap\'s LRU trick specifically is a well-known "build an LRU cache in one line" interview move.',
      },
      {
        name: 'Iterator & ConcurrentModificationException',
        definition: 'An Iterator lets you traverse a collection and optionally remove elements safely during traversal.',
        howItWorks: 'Modifying a collection directly (like list.remove()) while iterating over it with a for-each loop throws ConcurrentModificationException, because the collection\'s internal modification counter changed underneath the iterator. Using the iterator\'s own remove() method is safe because it keeps that counter in sync.',
        example:
          'Iterator<Integer> it = list.iterator();\n' +
          'while (it.hasNext()) {\n' +
          '  if (it.next() == 3) it.remove();  // safe\n' +
          '}',
        whyItMatters: 'This exception is one of the most commonly hit runtime surprises for people newer to Java collections.',
      },
      {
        name: 'Comparable vs Comparator',
        definition: 'Comparable defines a class\'s single "natural" ordering (via compareTo). Comparator defines an external, alternative ordering, and you can have as many as you like.',
        howItWorks: 'A class implements Comparable<T> once to say "this is how instances of me sort by default." A Comparator is a separate object (often a lambda) passed to a sort call when you want a different order without touching the class itself.',
        example:
          'list.sort(Comparator.comparing(Person::getAge).thenComparing(Person::getName));',
        whyItMatters: 'Sorting a custom object by a field is one of the most common practical Java tasks, and interviewers check you know both mechanisms exist.',
      },
    ],
  },
  {
    name: 'Exception Handling',
    items: [
      {
        name: 'Checked vs Unchecked Exceptions',
        definition: 'Checked exceptions (subclasses of Exception, not RuntimeException) must be declared or caught at compile time. Unchecked exceptions (subclasses of RuntimeException) are not enforced by the compiler.',
        howItWorks: 'Checked exceptions represent recoverable conditions the caller is expected to handle (like IOException). Unchecked exceptions typically represent programming errors (like NullPointerException or IllegalArgumentException) that shouldn\'t normally be caught and silently ignored.',
        whyItMatters: 'Whether to make a custom exception checked or unchecked is a genuine API design decision interviewers like to discuss.',
      },
      {
        name: 'try/catch/finally',
        definition: 'try wraps code that might throw, catch handles a specific exception type, finally always runs regardless of whether an exception occurred.',
        howItWorks: 'finally runs even if the try or catch block returns or throws — the only real exceptions are System.exit() or the JVM crashing. try-with-resources (try (Resource r = ...)) automatically closes a resource implementing AutoCloseable, replacing a manual finally { r.close(); }.',
        example:
          'try (BufferedReader br = new BufferedReader(new FileReader(path))) {\n' +
          '  return br.readLine();\n' +
          '} catch (IOException e) {\n' +
          '  return null;\n' +
          '}',
        whyItMatters: 'try-with-resources is the modern, expected way to handle closeable resources — using manual finally blocks for this reads as dated.',
      },
      {
        name: 'Custom Exceptions',
        definition: 'A user-defined exception class, usually extending Exception or RuntimeException, that represents a specific failure condition in your own domain.',
        howItWorks: 'Extending RuntimeException makes it unchecked (no forced try/catch at call sites); extending Exception makes it checked. Custom exceptions typically add fields carrying extra context (like which order ID failed) beyond the standard message.',
        example:
          'class InsufficientFundsException extends RuntimeException {\n' +
          '  InsufficientFundsException(String msg) { super(msg); }\n' +
          '}',
        whyItMatters: 'Writing domain-specific exceptions instead of throwing generic RuntimeException everywhere is a real code-quality signal.',
      },
      {
        name: 'Exception Chaining',
        definition: 'Wrapping a lower-level exception inside a higher-level one, preserving the original as the "cause," so debugging can see the full chain.',
        howItWorks: 'Passing the original exception to the new one\'s constructor (or calling initCause()) keeps its stack trace attached, so printStackTrace() shows both the wrapping exception and the original "Caused by."',
        example:
          'try { readConfig(); }\n' +
          'catch (IOException e) { throw new ConfigException("could not load config", e); }',
        whyItMatters: 'Losing the original stack trace when re-throwing is a real debugging-hostile mistake interviewers ask you to avoid.',
      },
    ],
  },
  {
    name: 'Generics',
    items: [
      {
        name: 'Generic Classes & Methods',
        definition: 'Generics let a class or method be parameterized by a type, so the same code works for multiple types with compile-time type safety.',
        howItWorks: 'Box<T> can hold any type T, decided when the class is used (Box<String>, Box<Integer>), and the compiler enforces you only put/get that type — catching type errors at compile time instead of at runtime with a ClassCastException.',
        example:
          'class Box<T> {\n' +
          '  private T value;\n' +
          '  void set(T value) { this.value = value; }\n' +
          '  T get() { return value; }\n' +
          '}\n' +
          'Box<String> b = new Box<>(); b.set("hi");',
        whyItMatters: 'Generics are the reason Java collections are type-safe today, compared to pre-Java-5 code that needed manual casting everywhere.',
      },
      {
        name: 'Bounded Type Parameters & Wildcards',
        definition: '<T extends Number> restricts a generic type to Number or its subclasses. Wildcards (? extends T, ? super T) describe unknown types at the call site.',
        howItWorks: '? extends T means "some subtype of T, I can only read from it safely." ? super T means "some supertype of T, I can only write T into it safely" — this is the basis of the PECS rule (Producer Extends, Consumer Super).',
        example:
          'void printAll(List<? extends Number> list) { for (Number n : list) System.out.println(n); }',
        whyItMatters: 'PECS specifically is a commonly-tested, genuinely non-obvious rule that separates surface-level generics knowledge from real understanding.',
      },
      {
        name: 'Type Erasure',
        definition: 'Generic type information exists only at compile time — at runtime, the JVM sees List<String> and List<Integer> as the same raw List type.',
        howItWorks: 'The compiler inserts casts automatically where needed and uses erasure to keep backward compatibility with pre-generics bytecode. This is why you can\'t do new T() or check if (obj instanceof List<String>) — that generic information simply isn\'t there at runtime.',
        whyItMatters: 'Explains several generics limitations (no generic arrays, no runtime generic type checks) that otherwise look like arbitrary restrictions.',
      },
    ],
  },
  {
    name: 'Streams & Lambdas',
    items: [
      {
        name: 'Lambda Expressions',
        definition: 'A lambda is a compact, anonymous function — syntax for implementing a functional interface (an interface with exactly one abstract method) inline.',
        howItWorks: '(params) -> expression (or a block) replaces writing out a full anonymous inner class. The compiler infers the parameter types from the functional interface\'s single method signature.',
        example:
          'Runnable r = () -> System.out.println("running");\n' +
          'Comparator<String> byLength = (a, b) -> a.length() - b.length();',
        whyItMatters: 'Lambdas are what make the Streams API usable — nearly every stream operation takes a lambda as its argument.',
      },
      {
        name: 'Stream Pipeline: map/filter/reduce',
        definition: 'A stream represents a sequence of elements supporting a pipeline of operations — map (transform), filter (keep matching), reduce (combine into one result).',
        howItWorks: 'Streams are lazy: intermediate operations (map, filter) don\'t actually run until a terminal operation (collect, forEach, reduce) triggers the pipeline. Each element flows through the whole pipeline one at a time rather than materializing a fully-mapped list first.',
        example:
          'List<String> names = people.stream()\n' +
          '  .filter(p -> p.getAge() > 18)\n' +
          '  .map(Person::getName)\n' +
          '  .collect(Collectors.toList());',
        whyItMatters: 'Streams are the standard modern way to express data transformations in Java — expect to be asked to rewrite a for-loop as a stream pipeline.',
      },
      {
        name: 'Optional',
        definition: 'A container that may or may not hold a non-null value, used as an explicit alternative to returning null.',
        howItWorks: 'Optional.of(value), Optional.empty(), and Optional.ofNullable(value) create one; isPresent()/orElse()/orElseThrow()/map() consume one safely without needing a manual null check.',
        example:
          'Optional<String> name = findUser(id).map(User::getName);\n' +
          'String result = name.orElse("unknown");',
        whyItMatters: 'Optional exists specifically to make "this might not have a value" visible in a method\'s signature, reducing NullPointerException risk.',
      },
    ],
  },
  {
    name: 'Multithreading & Concurrency',
    items: [
      {
        name: 'Thread vs Runnable',
        definition: 'A Thread is an actual unit of execution; Runnable is just a task (a single run() method) that a Thread (or an ExecutorService) can execute.',
        howItWorks: 'Extending Thread directly ties your class to being a thread. Implementing Runnable (and passing it to a Thread or executor) keeps the task decoupled from how it\'s actually run — generally the preferred approach, especially since Java doesn\'t support multiple inheritance.',
        example:
          'Runnable task = () -> System.out.println("working");\n' +
          'new Thread(task).start();',
        whyItMatters: '"Extend Thread or implement Runnable, and why" is a very standard opening concurrency question.',
      },
      {
        name: 'synchronized & Locks',
        definition: 'synchronized restricts a block or method to one thread at a time, based on acquiring an object\'s intrinsic lock (monitor).',
        howItWorks: 'A synchronized method locks on `this` (or the class object for a static method); a synchronized(obj) block locks on whatever object you specify. java.util.concurrent.locks.ReentrantLock offers more flexibility (tryLock, fairness policies, interruptible waits) at the cost of manually needing to unlock in a finally block.',
        example:
          'synchronized void increment() { count++; }\n\n' +
          'lock.lock();\n' +
          'try { count++; } finally { lock.unlock(); }',
        whyItMatters: 'Forgetting to unlock a ReentrantLock in a finally block is a real deadlock-causing bug interviewers check you\'d avoid.',
      },
      {
        name: 'Executors & Thread Pools',
        definition: 'An ExecutorService manages a pool of reusable threads, so you submit tasks instead of manually creating and managing Thread objects.',
        howItWorks: 'Creating a new Thread per task is expensive and unbounded; a thread pool reuses a fixed (or bounded) set of worker threads, queuing extra tasks until one frees up. Future<T> represents a result that will be available once a submitted task completes.',
        example:
          'ExecutorService pool = Executors.newFixedThreadPool(4);\n' +
          'Future<Integer> result = pool.submit(() -> computeSomething());\n' +
          'pool.shutdown();',
        whyItMatters: 'Manually managing raw Thread objects in real production code is a red flag — thread pools are the expected default.',
      },
      {
        name: 'volatile Keyword',
        definition: 'Marks a field so every read/write goes directly to main memory, never a thread-local cached copy.',
        howItWorks: 'Without volatile, one thread\'s update to a shared field might not be visible to another thread promptly (or at all) due to CPU/JVM caching. volatile guarantees visibility, but not atomicity — count++ on a volatile field can still race, since it\'s read-modify-write, not a single operation.',
        whyItMatters: '"volatile doesn\'t make an operation atomic" is a specific, commonly-tested gotcha that separates a shallow answer from a real one.',
      },
    ],
  },
  {
    name: 'JVM & Memory Management',
    items: [
      {
        name: 'Stack vs Heap',
        definition: 'The stack holds method call frames and local primitive variables/references. The heap holds all actual objects.',
        howItWorks: 'Each thread has its own stack; the heap is shared across all threads. A local variable of a reference type lives on the stack, but the object it points to lives on the heap — which is why passing an object reference to a method lets that method mutate the shared object.',
        whyItMatters: 'This distinction underlies why Java is "pass by value" even for objects — the value being passed is the reference itself, not the object.',
      },
      {
        name: 'Garbage Collection Basics',
        definition: 'The JVM automatically reclaims memory used by objects no longer reachable from any live reference.',
        howItWorks: 'Most collectors use a generational approach: new objects go into a "young generation," which is collected frequently and cheaply since most objects die young; objects surviving several collections get promoted to an "old generation," collected less often. You cannot force garbage collection deterministically — System.gc() is only a hint.',
        whyItMatters: 'Understanding "most objects die young" is why generational GC is fast in practice, not just a trivia fact.',
      },
      {
        name: 'Class Loading & the JVM Runtime',
        definition: 'The JVM loads .class bytecode files on demand via a class loader, verifies them, and then executes them via an interpreter and/or a Just-In-Time (JIT) compiler.',
        howItWorks: 'The JIT compiler identifies "hot" methods (called frequently) and compiles them to native machine code at runtime for speed, rather than interpreting bytecode every time — which is why long-running JVM processes tend to speed up after a warm-up period.',
        whyItMatters: 'This explains the common advice to benchmark JVM code only after a warm-up period, not on the very first call.',
      },
      {
        name: 'Memory Leaks in Java (despite GC)',
        definition: 'Java can still leak memory even with garbage collection — a "leak" here means objects stay reachable (and thus never collected) longer than intended.',
        howItWorks: 'Common causes: static collections that keep growing and are never cleared, listeners/callbacks registered but never unregistered, and inner classes holding an implicit reference to their outer class long after the outer object should be dead.',
        whyItMatters: '"Java has garbage collection, so it can\'t leak memory" is a genuinely common misconception interviewers like to correct.',
      },
    ],
  },
];

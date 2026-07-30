import { DsaTopic } from './models';

/**
 * Every problem gets a brute-force approach, an optimized approach (each with time/space
 * complexity and, for the optimized approach, pseudocode), and a plain-English explanation of
 * the core insight. That last field is deliberately not a repeat of the optimized approach's
 * description — it's aimed at *why* the trick works, which is usually the thing worth actually
 * remembering.
 */
export const DSA_TOPICS: DsaTopic[] = [
  {
    name: 'Arrays & Strings',
    problems: [
      {
        name: 'Two Sum',
        bruteForce: { description: 'Check every pair with nested loops.', time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Hash map of value → index, single pass; check for the complement before inserting.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'seen = {}\n' +
            'for i, x in enumerate(nums):\n' +
            '    complement = target - x\n' +
            '    if complement in seen:\n' +
            '        return [seen[complement], i]\n' +
            '    seen[x] = i',
        },
        explanation: "Before adding the current number to the map, check whether its complement (target minus the number) is already there. If it is, you've found the pair in one pass instead of comparing everything to everything.",
      },
      {
        name: 'Best Time to Buy and Sell Stock',
        bruteForce: { description: 'Try every pair of buy/sell days.', time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Track the running minimum price seen so far; at each day compute the profit if sold today, keep the max.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'minPrice = infinity\n' +
            'best = 0\n' +
            'for price in prices:\n' +
            '    minPrice = min(minPrice, price)\n' +
            '    best = max(best, price - minPrice)\n' +
            'return best',
        },
        explanation: "You never need to consider buying after the best moment so far — just remember the lowest price seen and check how much you'd profit selling today.",
      },
      {
        name: 'Product of Array Except Self',
        bruteForce: { description: 'For each index, multiply all other elements.', time: 'O(n^2)', space: 'O(1) extra' },
        optimized: {
          description: 'Prefix product from the left, suffix product from the right, combined in one or two passes.',
          time: 'O(n)', space: 'O(1) extra',
          pseudocode:
            'result = [1] * n\n' +
            'prefix = 1\n' +
            'for i in range(n): result[i] = prefix; prefix *= nums[i]\n' +
            'suffix = 1\n' +
            'for i in reversed(range(n)): result[i] *= suffix; suffix *= nums[i]\n' +
            'return result',
        },
        explanation: "The product except self at index i is just (everything before i multiplied together) times (everything after i multiplied together) — track those two running totals separately, without ever dividing.",
      },
      {
        name: "Maximum Subarray (Kadane's)",
        bruteForce: { description: "Check every subarray's sum.", time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: "Kadane's algorithm — keep a running sum, reset it to the current element whenever it goes negative, track the max seen.",
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'best = curr = nums[0]\n' +
            'for x in nums[1:]:\n' +
            '    curr = max(x, curr + x)\n' +
            '    best = max(best, curr)\n' +
            'return best',
        },
        explanation: 'A negative running sum can only drag down any subarray that includes it, so the moment the running total dips below zero, starting fresh from the next element is always at least as good.',
      },
      {
        name: 'Container With Most Water',
        bruteForce: { description: 'Check every pair of lines.', time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Two pointers from both ends; move the pointer with the shorter line inward.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'l, r = 0, n - 1\n' +
            'best = 0\n' +
            'while l < r:\n' +
            '    best = max(best, min(h[l], h[r]) * (r - l))\n' +
            '    if h[l] < h[r]: l += 1\n' +
            '    else: r -= 1',
        },
        explanation: "The width only ever shrinks as pointers move inward, and the area is capped by the shorter of the two lines — so moving the taller line inward can never help, while moving the shorter one is the only move that might find something bigger.",
      },
      {
        name: 'Longest Substring Without Repeating Characters',
        bruteForce: { description: 'Check every substring for duplicate characters.', time: 'O(n^2) to O(n^3)', space: 'O(min(n, charset))' },
        optimized: {
          description: 'Sliding window with a map of last-seen index per character; shrink the window from the left when a repeat is found.',
          time: 'O(n)', space: 'O(min(n, charset))',
          pseudocode:
            'lastSeen = {}\n' +
            'left = best = 0\n' +
            'for right, c in enumerate(s):\n' +
            '    if c in lastSeen and lastSeen[c] >= left:\n' +
            '        left = lastSeen[c] + 1\n' +
            '    lastSeen[c] = right\n' +
            '    best = max(best, right - left + 1)',
        },
        explanation: "Keep a window of unique characters; when a repeat shows up, jump the window's left edge to just past the previous occurrence instead of shrinking it one character at a time.",
      },
      {
        name: 'Group Anagrams',
        bruteForce: { description: 'Compare every string to every other for an anagram match.', time: 'O(n^2 * k log k)', space: 'O(n*k)' },
        optimized: {
          description: 'Hash map keyed by each string sorted (or its character-count signature); group strings sharing a key.',
          time: 'O(n * k log k)', space: 'O(n*k)',
          pseudocode:
            'groups = {}\n' +
            'for s in strs:\n' +
            '    key = sorted(s)\n' +
            '    groups.setdefault(key, []).append(s)\n' +
            'return list(groups.values())',
        },
        explanation: 'Anagrams share the exact same letters, so sorting a string (or counting its characters) gives every anagram of it the identical key — group by that key in a single pass.',
      },
      {
        name: '3Sum',
        bruteForce: { description: 'Three nested loops checking all triplets.', time: 'O(n^3)', space: 'O(1) extra' },
        optimized: {
          description: 'Sort the array, fix one element, then two-pointer scan the rest for a pair summing to the remaining target, skipping duplicates.',
          time: 'O(n^2)', space: 'O(1) extra',
          pseudocode:
            'nums.sort()\n' +
            'for i in range(n):\n' +
            '    if i > 0 and nums[i] == nums[i-1]: continue\n' +
            '    l, r = i+1, n-1\n' +
            '    while l < r:\n' +
            '        s = nums[i] + nums[l] + nums[r]\n' +
            '        if s == 0: record(i,l,r); l+=1; r-=1; skip dupes\n' +
            '        elif s < 0: l += 1\n' +
            '        else: r -= 1',
        },
        explanation: 'After sorting, fixing the first number turns the problem into "find two numbers summing to a target" in the remaining sorted slice — solvable with two pointers moving inward, far faster than checking every pair.',
      },
      {
        name: 'Valid Anagram',
        bruteForce: { description: 'Sort both strings and compare.', time: 'O(n log n)', space: 'O(n)' },
        optimized: {
          description: 'Count character frequencies for one string, decrement for the other, check everything lands on zero.',
          time: 'O(n)', space: 'O(1), bounded alphabet',
          pseudocode:
            'counts = frequency_map(s)\n' +
            'for c in t:\n' +
            '    counts[c] -= 1\n' +
            'return all(v == 0 for v in counts.values())',
        },
        explanation: 'Two strings are anagrams exactly when their character counts match, so tallying one and subtracting the other means true anagrams cancel out to all zeros without any sorting.',
      },
      {
        name: 'Contains Duplicate',
        bruteForce: { description: 'Compare every pair of elements.', time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Hash set — add elements one by one; return true the instant one is already present.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'seen = set()\n' +
            'for x in nums:\n' +
            '    if x in seen: return True\n' +
            '    seen.add(x)\n' +
            'return False',
        },
        explanation: 'A hash set answers "have I seen this before" in constant time, so checking membership before inserting catches the first duplicate immediately instead of comparing every pair.',
      },
      {
        name: 'Rotate Array',
        bruteForce: { description: 'Rotate one step at a time, k times, shifting every element each round.', time: 'O(n*k)', space: 'O(1)' },
        optimized: {
          description: 'Reverse the whole array, then reverse the first k elements, then reverse the remaining n-k elements.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'k %= n\n' +
            'reverse(nums, 0, n-1)\n' +
            'reverse(nums, 0, k-1)\n' +
            'reverse(nums, k, n-1)',
        },
        explanation: 'Reversing everything puts elements in the right relative rotated order but backward, and reversing each of the two resulting segments individually flips them back to correct order in place.',
      },
      {
        name: 'Set Matrix Zeroes',
        bruteForce: { description: 'Mark rows/columns to zero in a separate boolean grid, then apply it in a second pass.', time: 'O(rows*cols)', space: 'O(rows*cols)' },
        optimized: {
          description: "Use the matrix's own first row and column as marker storage, with one extra flag for whether the first row/column itself needs zeroing.",
          time: 'O(rows*cols)', space: 'O(1) extra',
          pseudocode:
            'firstRowZero = 0 in row0; firstColZero = 0 in col0\n' +
            'for r,c with matrix[r][c] == 0 (r,c > 0): matrix[r][0] = matrix[0][c] = 0\n' +
            'for r,c > 0: if matrix[r][0]==0 or matrix[0][c]==0: matrix[r][c] = 0\n' +
            'if firstRowZero: zero row 0\n' +
            'if firstColZero: zero col 0',
        },
        explanation: "Since you'll eventually zero out whole rows and columns anyway, you can record “this row/column needs zeroing” directly in that row/column's own first cell instead of allocating a separate grid to remember it.",
      },
      {
        name: 'Spiral Matrix',
        bruteForce: { description: 'Simulate direction-by-direction movement with a visited grid, reacting when hitting a wall or visited cell.', time: 'O(rows*cols)', space: 'O(rows*cols)' },
        optimized: {
          description: 'Maintain four shrinking boundaries (top, bottom, left, right); walk each edge in turn and shrink that boundary afterward.',
          time: 'O(rows*cols)', space: 'O(1) extra',
          pseudocode:
            'top, bottom, left, right = 0, rows-1, 0, cols-1\n' +
            'while top <= bottom and left <= right:\n' +
            '    walk row top left->right; top += 1\n' +
            '    walk col right top->bottom; right -= 1\n' +
            '    if top <= bottom: walk row bottom right->left; bottom -= 1\n' +
            '    if left <= right: walk col left bottom->top; left += 1',
        },
        explanation: "Instead of tracking every visited cell, track how much of the matrix's border has already been peeled off on each side — walking one edge at a time and shrinking that edge's boundary naturally spirals inward.",
      },
      {
        name: 'Trapping Rain Water',
        bruteForce: { description: 'For every position, scan left and right for the tallest bar on each side; water there is min(maxLeft, maxRight) − height.', time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Two pointers from both ends tracking a running max on each side; move whichever side has the smaller running max.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'l, r, leftMax, rightMax, water = 0, n-1, 0, 0, 0\n' +
            'while l < r:\n' +
            '    if h[l] < h[r]:\n' +
            '        leftMax = max(leftMax, h[l]); water += leftMax - h[l]; l += 1\n' +
            '    else:\n' +
            '        rightMax = max(rightMax, h[r]); water += rightMax - h[r]; r -= 1',
        },
        explanation: 'The water trapped at any position only depends on the shorter of the two tallest walls on either side, so once one side\'s running max is known to be smaller, that position\'s water is fully determined without needing the other side\'s exact max.',
      },
      {
        name: 'Longest Palindromic Substring',
        bruteForce: { description: 'Check every possible substring for being a palindrome.', time: 'O(n^3)', space: 'O(1) extra' },
        optimized: {
          description: 'Expand around every possible center (a character, or the gap between two characters), growing outward while characters match.',
          time: 'O(n^2)', space: 'O(1) extra',
          pseudocode:
            'def expand(l, r):\n' +
            '    while l >= 0 and r < n and s[l] == s[r]: l -= 1; r += 1\n' +
            '    return s[l+1:r]\n' +
            'best = ""\n' +
            'for i in range(n):\n' +
            '    best = longer(best, expand(i, i), expand(i, i+1))',
        },
        explanation: 'Every palindrome has a center it expands symmetrically from, so trying every possible center once and growing outward until symmetry breaks is far cheaper than checking every substring independently.',
      },
    ],
  },
  {
    name: 'Linked List',
    problems: [
      {
        name: 'Reverse Linked List',
        bruteForce: { description: 'Push node values into an array, then rebuild the list in reverse order.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Iterative pointer reversal (prev, curr, next) in a single pass.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'prev = None\n' +
            'curr = head\n' +
            'while curr:\n' +
            '    nxt = curr.next\n' +
            '    curr.next = prev\n' +
            '    prev = curr\n' +
            '    curr = nxt\n' +
            'return prev',
        },
        explanation: "Walk the list once, and at each node flip its `next` pointer to point backward instead of forward, keeping track of the previous node as you go.",
      },
      {
        name: "Detect Cycle (Floyd's)",
        bruteForce: { description: 'Store visited nodes in a hash set; check on every step whether the node has been seen.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Slow pointer moves 1 step, fast pointer moves 2; if they ever meet, there is a cycle.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'slow = fast = head\n' +
            'while fast and fast.next:\n' +
            '    slow = slow.next\n' +
            '    fast = fast.next.next\n' +
            '    if slow == fast: return True\n' +
            'return False',
        },
        explanation: 'A faster pointer moving twice the speed of a slower one will eventually lap and meet it inside a cycle, the same way a faster runner on a circular track eventually catches a slower one — no cycle just means the fast pointer reaches the end.',
      },
      {
        name: 'Merge Two Sorted Lists',
        bruteForce: { description: 'Dump all values into an array, sort, rebuild the list.', time: 'O(n log n)', space: 'O(n)' },
        optimized: {
          description: 'Merge in place by comparing the two heads and splicing whichever is smaller.',
          time: 'O(n+m)', space: 'O(1) extra',
          pseudocode:
            'dummy = tail = Node()\n' +
            'while l1 and l2:\n' +
            '    if l1.val <= l2.val: tail.next = l1; l1 = l1.next\n' +
            '    else: tail.next = l2; l2 = l2.next\n' +
            '    tail = tail.next\n' +
            'tail.next = l1 or l2\n' +
            'return dummy.next',
        },
        explanation: 'Because both lists are already sorted, only the current fronts of each list ever need comparing — attach whichever front is smaller and advance that list.',
      },
      {
        name: 'Remove Nth Node From End',
        bruteForce: { description: 'Count the list length first, then walk again to the target node.', time: 'O(n), two passes', space: 'O(1)' },
        optimized: {
          description: 'Two pointers with a fixed gap of n; advance the front one n steps first, then move both together until the front hits the end.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'fast = slow = dummy(next=head)\n' +
            'repeat n times: fast = fast.next\n' +
            'while fast.next: fast = fast.next; slow = slow.next\n' +
            'slow.next = slow.next.next',
        },
        explanation: 'Keeping a fixed gap of n between two pointers means that when the front one reaches the end, the back one is automatically sitting exactly n from the end, without ever counting the list length.',
      },
      {
        name: 'Reorder List',
        bruteForce: { description: 'Dump nodes into an array, relink using front/back index arithmetic.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Find the middle with slow/fast pointers, reverse the second half in place, then merge the two halves by alternating nodes.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'mid = findMiddle(head)\n' +
            'second = reverse(mid.next); mid.next = None\n' +
            'while second: splice one node from second between consecutive head nodes',
        },
        explanation: 'Splitting the list at its middle, flipping the back half, and zipping the two halves together one node at a time produces exactly the front-back-front-back pattern the problem asks for.',
      },
      {
        name: 'Merge K Sorted Lists',
        bruteForce: { description: 'Concatenate all values into one array, sort, rebuild.', time: 'O(N log N)', space: 'O(N)' },
        optimized: {
          description: 'Min-heap holding the current head of each list; repeatedly pop the smallest and push its next.',
          time: 'O(N log k)', space: 'O(k)',
          pseudocode:
            'heap = [(list.val, i, list) for i, list in enumerate(lists) if list]\n' +
            'heapify(heap)\n' +
            'while heap:\n' +
            '    val, i, node = heappop(heap)\n' +
            '    append node to result\n' +
            '    if node.next: heappush(heap, (node.next.val, i, node.next))',
        },
        explanation: "A min-heap always surfaces the smallest 'next candidate' across all k lists in log(k) time, so you never compare all k heads directly — just repeatedly pull the minimum.",
      },
      {
        name: 'Design LRU Cache',
        bruteForce: { description: 'Array or plain map with a linear scan to find/update the least-recently-used item every access.', time: 'O(n) per op', space: 'O(n)' },
        optimized: {
          description: 'Hash map for O(1) lookup, paired with a doubly linked list that maintains recency order.',
          time: 'O(1) per get/put', space: 'O(n)',
          pseudocode:
            'get(key): if key in map: moveToFront(map[key]); return value\n' +
            'put(key, val):\n' +
            '    if key in map: update value; moveToFront(node)\n' +
            '    else: if full: evict tail; insert new node at front; map[key] = node',
        },
        explanation: 'The hash map answers "does this key exist and where," while the linked list answers "who was used least recently" — combining them means both questions are answered instantly instead of by scanning.',
      },
      {
        name: 'Palindrome Linked List',
        bruteForce: { description: 'Copy values into an array, check if it reads the same forwards and backwards.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Find the middle with slow/fast pointers, reverse the second half in place, compare both halves node by node.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'mid = findMiddle(head)\n' +
            'second = reverse(mid.next)\n' +
            'while second: if first.val != second.val: return False; first = first.next; second = second.next\n' +
            'return True',
        },
        explanation: 'Reversing just the second half lets you walk both halves simultaneously from their own starts and compare values directly, without any extra storage.',
      },
      {
        name: 'Add Two Numbers',
        bruteForce: { description: 'Convert both lists to actual integers, add, convert the sum back into a list.', time: 'O(n)', space: 'O(n), breaks on very large numbers' },
        optimized: {
          description: 'Simulate elementary-school addition digit by digit (node by node), carrying 1 whenever a sum exceeds 9.',
          time: 'O(max(n,m))', space: 'O(max(n,m))',
          pseudocode:
            'carry = 0; dummy = tail = Node()\n' +
            'while l1 or l2 or carry:\n' +
            '    s = (l1.val if l1 else 0) + (l2.val if l2 else 0) + carry\n' +
            '    carry, digit = divmod(s, 10)\n' +
            '    tail.next = Node(digit); tail = tail.next\n' +
            '    l1 = l1.next if l1 else None; l2 = l2.next if l2 else None',
        },
        explanation: "Because each list stores a digit per node, adding them is exactly like adding numbers on paper — add corresponding digits plus any carry, keep the ones digit, and carry the tens digit to the next pair.",
      },
      {
        name: 'Copy List with Random Pointer',
        bruteForce: { description: 'Two passes with a hash map from original node to its clone: first build all clones, then wire up next/random using the map.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Splice each clone directly after its original in the same list, copy random pointers using that structure, then unweave the two lists.',
          time: 'O(n)', space: 'O(1) extra',
          pseudocode:
            'for node in original: insert clone(node) right after node\n' +
            'for node in original: node.next.random = node.random.next if node.random else None\n' +
            'unweave: separate the interleaved clone nodes back into their own list',
        },
        explanation: '"original.random.next" (the node right after the target\'s original) is exactly the clone of the random pointer\'s target once clones are interwoven — letting you copy random pointers with no lookup table.',
      },
      {
        name: 'Odd Even Linked List',
        bruteForce: { description: 'Split into two lists during traversal using temporary arrays, then relink.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Maintain running odd-tail and even-tail pointers in one pass, threading each node onto its parity\'s chain, then attach the even chain after the odd chain.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'odd = head; even = evenHead = head.next\n' +
            'while even and even.next:\n' +
            '    odd.next = even.next; odd = odd.next\n' +
            '    even.next = odd.next; even = even.next\n' +
            'odd.next = evenHead',
        },
        explanation: 'Both the odd-indexed and even-indexed sublists can be built simultaneously in a single pass by alternating which running pointer\'s `next` you update, then joining the two completed chains at the end.',
      },
      {
        name: 'Intersection of Two Linked Lists',
        bruteForce: { description: 'For every node in list A, scan all of list B checking for a matching reference.', time: 'O(n*m)', space: 'O(1)' },
        optimized: {
          description: 'Two pointers, one starting at each head; when a pointer runs out, redirect it to the other list\'s head — they meet at the intersection.',
          time: 'O(n+m)', space: 'O(1)',
          pseudocode:
            'a, b = headA, headB\n' +
            'while a != b:\n' +
            '    a = a.next if a else headB\n' +
            '    b = b.next if b else headA\n' +
            'return a  # intersection node, or null',
        },
        explanation: 'Switching each pointer to the other list once it runs out equalizes the total distance both pointers travel before the intersection, so they arrive there together regardless of how different the two lengths are.',
      },
      {
        name: 'Flatten a Multilevel Doubly Linked List',
        bruteForce: { description: 'Recursively collect all nodes into a flat array in order, then rebuild next/prev links from that array.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Stack-based traversal that, on hitting a node with a child, saves the node\'s original next, descends into the child, and reconnects the flattened tail back to the saved next.',
          time: 'O(n)', space: 'O(n) worst case',
          pseudocode:
            'stack = [head]; prev = None\n' +
            'while stack:\n' +
            '    node = stack.pop()\n' +
            '    link prev to node\n' +
            '    if node.next: stack.push(node.next)\n' +
            '    if node.child: stack.push(node.child); node.child = None\n' +
            '    prev = node',
        },
        explanation: "A stack (explicit or via recursion) naturally handles resuming exactly where you paused to descend into a child, reattaching the node's original next once that child's list is fully flattened in.",
      },
      {
        name: 'Swap Nodes in Pairs',
        bruteForce: { description: 'Collect node values into an array, swap adjacent values, write them back into the nodes.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Rewire pointers three nodes at a time (previous, first, second) so the second node comes before the first, without touching values.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'prev = dummy(next=head)\n' +
            'while prev.next and prev.next.next:\n' +
            '    first, second = prev.next, prev.next.next\n' +
            '    first.next = second.next; second.next = first; prev.next = second\n' +
            '    prev = first',
        },
        explanation: 'Swapping the actual `next` pointers of each adjacent pair, rather than copying their values, keeps node identity intact and needs no extra storage.',
      },
      {
        name: 'Rotate List',
        bruteForce: { description: 'Repeatedly move the last node to the front, one rotation at a time, k times.', time: 'O(n*k)', space: 'O(1)' },
        optimized: {
          description: 'Connect the list into a circle, find the new head position (n − k%n steps from the old head), break the circle there.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'length = count(head); k %= length\n' +
            'tail.next = head  # make it circular\n' +
            'stepsToNewTail = length - k\n' +
            'newTail = walk(head, stepsToNewTail - 1)\n' +
            'newHead = newTail.next; newTail.next = None',
        },
        explanation: 'Rotating by k is equivalent to choosing a different starting point on a circular version of the same list, so joining the tail to the head and cutting at the right spot avoids doing k separate single-step rotations.',
      },
    ],
  },
  {
    name: 'Stacks & Queues',
    problems: [
      {
        name: 'Valid Parentheses',
        bruteForce: { description: 'Repeatedly remove adjacent matching pairs from the string until no more can be removed, check if empty.', time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'Push opening brackets onto a stack; pop and check the match on every closing bracket.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'stack = []\n' +
            'for c in s:\n' +
            '    if c is opening: stack.push(c)\n' +
            '    else:\n' +
            '        if not stack or not matches(stack.pop(), c): return False\n' +
            'return stack.empty()',
        },
        explanation: 'A stack naturally mirrors nested structure — the most recently seen unmatched opening bracket is always the one that must match the very next closing bracket.',
      },
      {
        name: 'Min Stack',
        bruteForce: { description: 'Scan the whole stack to find the minimum whenever getMin() is called.', time: 'O(n) per getMin', space: 'O(n)' },
        optimized: {
          description: 'Maintain a second stack tracking the running minimum at every push.',
          time: 'O(1) per op', space: 'O(n)',
          pseudocode:
            'push(x): stack.push(x); minStack.push(min(x, minStack.top() or x))\n' +
            'pop(): stack.pop(); minStack.pop()\n' +
            'getMin(): return minStack.top()',
        },
        explanation: 'Pushing the current minimum alongside every element means popping the main stack also "undoes" back to whatever the minimum was before that element existed.',
      },
      {
        name: 'Evaluate Reverse Polish Notation',
        bruteForce: { description: 'Recursively scan for the first operator and its two preceding operands, repeat.', time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'Single pass with a stack — push numbers, and on an operator pop two operands, compute, push the result.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'stack = []\n' +
            'for token in tokens:\n' +
            '    if token is a number: stack.push(token)\n' +
            '    else: b = stack.pop(); a = stack.pop(); stack.push(apply(token, a, b))\n' +
            'return stack.pop()',
        },
        explanation: 'Postfix notation is built for stack evaluation — an operator always applies to the two most recently seen operands, which by definition sit on top of the stack.',
      },
      {
        name: 'Daily Temperatures',
        bruteForce: { description: 'For each day, scan forward until a warmer day is found.', time: 'O(n^2)', space: 'O(1) extra' },
        optimized: {
          description: 'Monotonic decreasing stack of indices; pop and resolve whenever a warmer day appears.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'stack = []  # indices, decreasing temps\n' +
            'for i, t in enumerate(temps):\n' +
            '    while stack and temps[stack.top()] < t:\n' +
            '        j = stack.pop(); answer[j] = i - j\n' +
            '    stack.push(i)',
        },
        explanation: 'A stack of days still waiting for a warmer day gets resolved in bulk the moment a warmer temperature shows up, instead of searching forward for every day.',
      },
      {
        name: 'Implement Queue using Stacks',
        bruteForce: { description: 'Two stacks, always re-shuffling both to preserve order on every operation.', time: 'O(n) per op', space: 'O(n)' },
        optimized: {
          description: 'Push always to an "in" stack; only transfer to an "out" stack when it is empty and a pop/peek is needed.',
          time: 'O(1) amortized', space: 'O(n)',
          pseudocode:
            'push(x): inStack.push(x)\n' +
            'pop():\n' +
            '    if outStack.empty(): while inStack: outStack.push(inStack.pop())\n' +
            '    return outStack.pop()',
        },
        explanation: 'Reversing the "in" stack into the "out" stack only when the out stack runs dry means each element is moved at most twice in its lifetime, regardless of how many operations happen.',
      },
      {
        name: 'Next Greater Element',
        bruteForce: { description: 'For each element, scan forward (or through a second array) to find the first greater element.', time: 'O(n*m)', space: 'O(1) extra' },
        optimized: {
          description: 'Monotonic decreasing stack processed once; pop and record whenever a greater element appears.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'stack = []\n' +
            'for i, x in enumerate(nums):\n' +
            '    while stack and nums[stack.top()] < x:\n' +
            '        j = stack.pop(); result[j] = x\n' +
            '    stack.push(i)',
        },
        explanation: 'Same trick as Daily Temperatures — a stack of "elements still waiting for something bigger" resolves in bulk the moment a bigger element arrives.',
      },
      {
        name: 'Sliding Window Maximum',
        bruteForce: { description: 'For every window, scan its k elements to find the max.', time: 'O(n*k)', space: 'O(1) extra' },
        optimized: {
          description: 'Monotonic decreasing deque of indices — front is the window\'s max; pop smaller trailing elements from the back, pop expired ones from the front.',
          time: 'O(n)', space: 'O(k)',
          pseudocode:
            'deque = []  # indices, decreasing values\n' +
            'for i, x in enumerate(nums):\n' +
            '    while deque and nums[deque.back()] < x: deque.pop_back()\n' +
            '    deque.push_back(i)\n' +
            '    if deque.front() <= i - k: deque.pop_front()\n' +
            '    if i >= k - 1: result.append(nums[deque.front()])',
        },
        explanation: 'An element can never be the window\'s max once a bigger element appears after it, so a deque that discards smaller trailing elements always keeps the true max sitting at the front.',
      },
      {
        name: 'Implement Stack using Queues',
        bruteForce: { description: 'Two queues, always keeping the active queue reversed after every push.', time: 'O(n) per push', space: 'O(n)' },
        optimized: {
          description: 'Single queue — after pushing, rotate the queue by dequeuing and re-enqueuing every prior element behind the new one.',
          time: 'O(n) per push', space: 'O(n)',
          pseudocode:
            'push(x):\n' +
            '    queue.enqueue(x)\n' +
            '    repeat (size - 1) times: queue.enqueue(queue.dequeue())',
        },
        explanation: 'Rotating older elements behind a freshly pushed one "promotes" the newest element to the front of the queue, which is exactly where a stack\'s next pop should come from.',
      },
      {
        name: 'Decode String',
        bruteForce: { description: 'Repeatedly find and expand the innermost bracket pair, rescanning the whole string from scratch each time.', time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'Stack of (previous string, repeat count) pairs — push when entering a bracket, pop and combine when a closing bracket is found.',
          time: 'O(output length)', space: 'O(n)',
          pseudocode:
            'stack = []; curr = ""; num = 0\n' +
            'for c in s:\n' +
            '    if c.isdigit(): num = num*10 + int(c)\n' +
            '    elif c == "[": stack.push((curr, num)); curr = ""; num = 0\n' +
            '    elif c == "]": prevStr, k = stack.pop(); curr = prevStr + curr*k\n' +
            '    else: curr += c',
        },
        explanation: 'Entering a bracket means pausing and remembering what you had so far; closing it means resuming that paused state, now with the inner string appended the right number of times.',
      },
      {
        name: 'Basic Calculator',
        bruteForce: { description: 'Recursively evaluate parenthesized subexpressions using string slicing and re-parsing from scratch.', time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'Single pass using a stack holding "the running result and sign so far" whenever entering a parenthesis.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'stack = []; result = 0; sign = 1; num = 0\n' +
            'for c in s:\n' +
            '    if c.isdigit(): num = num*10 + int(c)\n' +
            '    elif c in "+-": result += sign*num; num=0; sign = 1 if c=="+" else -1\n' +
            '    elif c == "(": stack.push(result, sign); result=0; sign=1\n' +
            '    elif c == ")": result += sign*num; num=0; prevResult, prevSign = stack.pop(); result = prevResult + prevSign*result',
        },
        explanation: 'A stack lets you save your place — the result before an opening parenthesis and the sign applying to that whole group — and resume there once the group is fully evaluated.',
      },
      {
        name: 'Asteroid Collision',
        bruteForce: { description: 'Repeatedly scan for the first colliding adjacent pair, resolve it, and rescan from the start.', time: 'O(n^2)', space: 'O(1) extra' },
        optimized: {
          description: 'Single pass with a stack — push right-moving asteroids; resolve collisions against the stack top when a left-moving one appears.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'stack = []\n' +
            'for a in asteroids:\n' +
            '    alive = True\n' +
            '    while alive and a < 0 and stack and stack.top() > 0:\n' +
            '        if stack.top() < -a: stack.pop(); continue\n' +
            '        elif stack.top() == -a: stack.pop()\n' +
            '        alive = False\n' +
            '    if alive: stack.push(a)',
        },
        explanation: 'Only a right-mover followed later by a left-mover can ever collide, and the stack naturally holds exactly the right-movers still "in flight" that a new left-mover might crash into.',
      },
      {
        name: 'Remove K Digits',
        bruteForce: { description: 'Try every combination of k digits to remove, checking which leaves the smallest result.', time: 'combinatorial', space: 'O(n)' },
        optimized: {
          description: 'Monotonic increasing stack — pop larger previous digits whenever the current digit is smaller and removals remain.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'stack = []\n' +
            'for d in num:\n' +
            '    while k > 0 and stack and stack.top() > d: stack.pop(); k -= 1\n' +
            '    stack.push(d)\n' +
            'while k > 0: stack.pop(); k -= 1\n' +
            'return strip_leading_zeros("".join(stack)) or "0"',
        },
        explanation: 'To make the smallest number, the leftmost digits should be as small as possible, so popping a larger previous digit for a smaller new one — while removals remain — greedily improves the result.',
      },
      {
        name: 'Largest Rectangle in Histogram',
        bruteForce: { description: 'For every bar, expand left and right to find how far a rectangle of that height could extend.', time: 'O(n^2)', space: 'O(1) extra' },
        optimized: {
          description: 'Monotonic increasing stack of indices; when a shorter bar appears, pop and compute area for each taller bar popped.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'stack = []; best = 0\n' +
            'for i, h in enumerate(heights + [0]):\n' +
            '    while stack and heights[stack.top()] > h:\n' +
            '        height = heights[stack.pop()]\n' +
            '        width = i if not stack else i - stack.top() - 1\n' +
            '        best = max(best, height * width)\n' +
            '    stack.push(i)',
        },
        explanation: "A bar's rectangle can only extend to the nearest shorter bar on each side, and a monotonic stack finds that nearest-shorter-bar boundary for free the moment a shorter bar appears.",
      },
      {
        name: 'Online Stock Span',
        bruteForce: { description: 'For each new price, scan backward through all previous prices counting how many are ≤ it before hitting a bigger one.', time: 'O(n^2) worst case', space: 'O(n)' },
        optimized: {
          description: 'Monotonic decreasing stack of (price, span) pairs; pop and accumulate spans of prices ≤ today, then push today with the accumulated span.',
          time: 'O(n) amortized', space: 'O(n)',
          pseudocode:
            'stack = []  # (price, span)\n' +
            'def next(price):\n' +
            '    span = 1\n' +
            '    while stack and stack.top().price <= price: span += stack.pop().span\n' +
            '    stack.push((price, span))\n' +
            '    return span',
        },
        explanation: "Any previous day whose price was ≤ today's is absorbed into today's span, so popping and summing those (rather than rescanning them individually) reuses work already counted.",
      },
      {
        name: 'Sliding Window Median',
        bruteForce: { description: 'For every window, sort its contents to find the median.', time: 'O(n*k log k)', space: 'O(k)' },
        optimized: {
          description: 'Two balanced heaps (or a balanced multiset); remove the outgoing element, insert the incoming one as the window slides, rebalance.',
          time: 'O(n log k)', space: 'O(k)',
          pseudocode:
            'lowHeap (max-heap), highHeap (min-heap), sized to differ by <= 1\n' +
            'on slide: remove outgoing value from its heap (lazy deletion), insert incoming, rebalance sizes\n' +
            'median = top of larger heap, or average of both tops if equal size',
        },
        explanation: 'Splitting the window into a "lower half" and "upper half" heap keeps the median instantly available; sliding just means removing one element and adding another, then rebalancing.',
      },
    ],
  },
  {
    name: 'Trees & BST',
    problems: [
      {
        name: 'Maximum Depth of Binary Tree',
        bruteForce: { description: 'BFS level by level, count levels.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Recursive DFS — depth is 1 + max(left depth, right depth).',
          time: 'O(n)', space: 'O(h)',
          pseudocode:
            'def depth(node):\n' +
            '    if not node: return 0\n' +
            '    return 1 + max(depth(node.left), depth(node.right))',
        },
        explanation: "A tree's depth is one more than the deeper of its two subtrees' depths, so the recursive definition falls straight out of that fact.",
      },
      {
        name: 'Same Tree',
        bruteForce: { description: 'Serialize both trees (e.g. preorder with null markers) and compare the strings.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Recursively check the roots match and both pairs of subtrees are identical simultaneously.',
          time: 'O(n)', space: 'O(h)',
          pseudocode:
            'def same(a, b):\n' +
            '    if not a and not b: return True\n' +
            '    if not a or not b or a.val != b.val: return False\n' +
            '    return same(a.left, b.left) and same(a.right, b.right)',
        },
        explanation: 'Two trees are identical exactly when their roots match and both subtree pairs are recursively identical — comparing node by node avoids building any intermediate representation.',
      },
      {
        name: 'Invert Binary Tree',
        bruteForce: { description: 'BFS/DFS collecting all nodes, swap children of each in a second pass.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: "Recursively swap a node's children, then recurse into the (now-swapped) children.",
          time: 'O(n)', space: 'O(h)',
          pseudocode:
            'def invert(node):\n' +
            '    if not node: return None\n' +
            '    node.left, node.right = invert(node.right), invert(node.left)\n' +
            '    return node',
        },
        explanation: 'Inverting a tree just means swapping left and right at every node, and recursion applies that swap at each level down for free.',
      },
      {
        name: 'Binary Tree Level Order Traversal',
        bruteForce: { description: 'DFS while tracking depth, appending each value into a list of lists keyed by depth.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'BFS with a queue, processing one full level per iteration using a queue-size snapshot.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'queue = [root]\n' +
            'while queue:\n' +
            '    levelSize = len(queue)\n' +
            '    level = []\n' +
            '    repeat levelSize times: node = queue.pop(); level.append(node.val); enqueue children\n' +
            '    result.append(level)',
        },
        explanation: 'Snapshotting the queue size before dequeuing exactly that many nodes groups precisely one tree level per iteration.',
      },
      {
        name: 'Validate Binary Search Tree',
        bruteForce: { description: 'For every node, check the entire left subtree is smaller and the entire right subtree is bigger.', time: 'O(n^2)', space: 'O(h)' },
        optimized: {
          description: 'Recursive check carrying a valid (min, max) range down to each node, or an in-order traversal checking strictly increasing values.',
          time: 'O(n)', space: 'O(h)',
          pseudocode:
            'def valid(node, low, high):\n' +
            '    if not node: return True\n' +
            '    if not (low < node.val < high): return False\n' +
            '    return valid(node.left, low, node.val) and valid(node.right, node.val, high)',
        },
        explanation: 'A BST is valid only when every node falls within the range implied by its ancestors, so passing a shrinking (min, max) bound down as you recurse checks the whole tree in one pass.',
      },
      {
        name: 'Lowest Common Ancestor of BST',
        bruteForce: { description: 'Find the root-to-node path for both targets, compare paths to find where they diverge.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Using BST ordering, go left if both targets are smaller, right if both are larger, otherwise you\'re at the LCA.',
          time: 'O(h)', space: 'O(1)',
          pseudocode:
            'node = root\n' +
            'while node:\n' +
            '    if p.val < node.val and q.val < node.val: node = node.left\n' +
            '    elif p.val > node.val and q.val > node.val: node = node.right\n' +
            '    else: return node',
        },
        explanation: 'In a BST, the moment the two target values fall on different sides of the current node (or match it), that node is where their paths split — value comparisons steer instead of exploring both subtrees.',
      },
      {
        name: 'Serialize/Deserialize Binary Tree',
        bruteForce: { description: 'Level-order (BFS) serialization storing null markers at every position, rebuilt with index arithmetic.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Preorder DFS serialization with null markers, deserialized by consuming the same sequence recursively.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'serialize(node): if not node: return "#"; return f"{node.val},{serialize(node.left)},{serialize(node.right)}"\n' +
            'deserialize(values):\n' +
            '    v = next(values)\n' +
            '    if v == "#": return None\n' +
            '    node = Node(v); node.left = deserialize(values); node.right = deserialize(values); return node',
        },
        explanation: "Recording nulls explicitly encodes the tree's shape directly in the sequence, so reconstruction is just replaying the same recursive read-node/read-left/read-right process.",
      },
      {
        name: 'Kth Smallest Element in BST',
        bruteForce: { description: 'In-order traversal collecting all values, return the kth.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: "In-order traversal (iterative with an explicit stack) that stops after visiting k nodes.",
          time: 'O(h+k)', space: 'O(h)',
          pseudocode:
            'stack = []; node = root\n' +
            'while True:\n' +
            '    while node: stack.push(node); node = node.left\n' +
            '    node = stack.pop(); k -= 1\n' +
            '    if k == 0: return node.val\n' +
            '    node = node.right',
        },
        explanation: 'In-order traversal of a BST visits nodes in ascending sorted order for free, so the kth node visited is simply the kth smallest.',
      },
      {
        name: 'Diameter of Binary Tree',
        bruteForce: { description: "For every node, compute left and right subtree height as fresh, separate traversals.", time: 'O(n^2)', space: 'O(h)' },
        optimized: {
          description: 'Single DFS computing height recursively while updating a running max diameter using left height + right height at every node.',
          time: 'O(n)', space: 'O(h)',
          pseudocode:
            'best = 0\n' +
            'def height(node):\n' +
            '    if not node: return 0\n' +
            '    l, r = height(node.left), height(node.right)\n' +
            '    best = max(best, l + r)\n' +
            '    return 1 + max(l, r)',
        },
        explanation: "The longest path through any node is its left subtree's height plus its right subtree's height, so computing heights bottom-up once and tracking a running max avoids recomputing heights over and over.",
      },
      {
        name: 'Binary Tree Right Side View',
        bruteForce: { description: 'Full level-order traversal collecting every node into levels, then take the last element of each.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'DFS visiting right child before left child, recording the first node seen at each depth.',
          time: 'O(n)', space: 'O(h)',
          pseudocode:
            'def dfs(node, depth):\n' +
            '    if not node: return\n' +
            '    if depth == len(result): result.append(node.val)\n' +
            '    dfs(node.right, depth + 1)\n' +
            '    dfs(node.left, depth + 1)',
        },
        explanation: 'Exploring right before left at every node guarantees the first time you reach a new depth, you\'re looking at the rightmost node there — no need to track a full level.',
      },
      {
        name: 'Path Sum II',
        bruteForce: { description: 'Enumerate every root-to-leaf path fully, then filter for those summing to the target.', time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'DFS backtracking — add the node to a running path, subtract its value from the remaining target, recurse, then remove the node.',
          time: 'O(n^2) worst case', space: 'O(h)',
          pseudocode:
            'def dfs(node, remaining, path):\n' +
            '    if not node: return\n' +
            '    path.append(node.val); remaining -= node.val\n' +
            '    if is_leaf(node) and remaining == 0: result.append(path.copy())\n' +
            '    else: dfs(node.left, remaining, path); dfs(node.right, remaining, path)\n' +
            '    path.pop()',
        },
        explanation: "Backtracking reuses a single running path array across the whole traversal — add before recursing into children, remove right after, so the array always reflects the current root-to-node path.",
      },
      {
        name: 'Construct Binary Tree from Preorder and Inorder',
        bruteForce: { description: "For each preorder value, linearly search the inorder array for its split position.", time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'Hash map from value to inorder index for O(1) lookups, then recursively build using preorder position and inorder range boundaries.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'indexOf = {val: i for i, val in enumerate(inorder)}\n' +
            'preIdx = 0\n' +
            'def build(inLeft, inRight):\n' +
            '    if inLeft > inRight: return None\n' +
            '    rootVal = preorder[preIdx]; preIdx += 1\n' +
            '    root = Node(rootVal); mid = indexOf[rootVal]\n' +
            '    root.left = build(inLeft, mid - 1)\n' +
            '    root.right = build(mid + 1, inRight)\n' +
            '    return root',
        },
        explanation: "The first element of a preorder slice is always the subtree's root, and its position in the inorder slice tells you exactly how many nodes belong to the left subtree — a map makes that lookup instant.",
      },
      {
        name: 'Lowest Common Ancestor of a Binary Tree',
        bruteForce: { description: 'Find the full root-to-node path for both targets, compare to find the last common node.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Recursive DFS reporting whether target A, B, or both were found beneath each subtree; a node is the LCA when both are found in different subtrees below it.',
          time: 'O(n)', space: 'O(h)',
          pseudocode:
            'def lca(node):\n' +
            '    if not node or node == p or node == q: return node\n' +
            '    left = lca(node.left); right = lca(node.right)\n' +
            '    if left and right: return node\n' +
            '    return left or right',
        },
        explanation: "If a node's left subtree contains one target and its right subtree contains the other, that node is exactly where their paths split — no explicit path lists needed.",
      },
      {
        name: 'Balanced Binary Tree',
        bruteForce: { description: "For every node, independently compute left and right subtree heights and compare.", time: 'O(n^2)', space: 'O(h)' },
        optimized: {
          description: 'Bottom-up DFS computing height and checking balance simultaneously, short-circuiting with an early "unbalanced" signal.',
          time: 'O(n)', space: 'O(h)',
          pseudocode:
            'def height(node):\n' +
            '    if not node: return 0\n' +
            '    l = height(node.left); if l == -1: return -1\n' +
            '    r = height(node.right); if r == -1: return -1\n' +
            '    if abs(l - r) > 1: return -1\n' +
            '    return 1 + max(l, r)',
        },
        explanation: "Computing height and checking balance in the same pass means each subtree's height is computed once, and an early signal lets ancestors skip redundant checks once a violation is found anywhere below.",
      },
      {
        name: 'Binary Tree Maximum Path Sum',
        bruteForce: { description: 'Enumerate every possible path between every pair of nodes and sum them.', time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'DFS returning the best single-branch sum (clamped to non-negative) extending upward from each node, while a global max also considers the "through this node" path using both children.',
          time: 'O(n)', space: 'O(h)',
          pseudocode:
            'best = -infinity\n' +
            'def gain(node):\n' +
            '    if not node: return 0\n' +
            '    l = max(gain(node.left), 0); r = max(gain(node.right), 0)\n' +
            '    best = max(best, node.val + l + r)\n' +
            '    return node.val + max(l, r)',
        },
        explanation: "A path can bend only once, at its highest node, so each node separately considers the best path passing straight through it (for the global answer) versus the best single branch it can hand up to its parent.",
      },
    ],
  },
  {
    name: 'Heaps',
    problems: [
      {
        name: 'Kth Largest Element in an Array',
        bruteForce: { description: 'Sort the array, return the kth from the end.', time: 'O(n log n)', space: 'O(1) extra' },
        optimized: {
          description: 'Min-heap of size k — push elements, pop when size exceeds k; the top ends up being the kth largest.',
          time: 'O(n log k)', space: 'O(k)',
          pseudocode:
            'heap = []\n' +
            'for x in nums:\n' +
            '    heappush(heap, x)\n' +
            '    if len(heap) > k: heappop(heap)\n' +
            'return heap[0]',
        },
        explanation: "Keeping only the k largest elements seen so far in a small heap means the smallest of those k, sitting at the heap's top, is exactly the kth largest overall once everything's been scanned.",
      },
      {
        name: 'Top K Frequent Elements',
        bruteForce: { description: 'Count frequencies, sort all unique elements by frequency, take the top k.', time: 'O(n log n)', space: 'O(n)' },
        optimized: {
          description: 'Count frequencies with a hash map, then a min-heap of size k (or bucket sort by frequency) extracts the top k.',
          time: 'O(n log k)', space: 'O(n)',
          pseudocode:
            'counts = frequency_map(nums)\n' +
            'heap = []\n' +
            'for val, freq in counts.items():\n' +
            '    heappush(heap, (freq, val))\n' +
            '    if len(heap) > k: heappop(heap)\n' +
            'return [val for freq, val in heap]',
        },
        explanation: "Once each element's frequency is known, a small heap of size k (or bucketing by count) finds the top k without ever sorting the whole list.",
      },
      {
        name: 'Merge K Sorted Lists (heap approach)',
        bruteForce: { description: 'Concatenate and sort all values.', time: 'O(N log N)', space: 'O(N)' },
        optimized: {
          description: 'Min-heap holding one candidate per list; repeatedly pop the min and push its successor.',
          time: 'O(N log k)', space: 'O(k)',
          pseudocode:
            'heap = [(list.val, i, list) for i, list in enumerate(lists) if list]\n' +
            'heapify(heap)\n' +
            'while heap:\n' +
            '    val, i, node = heappop(heap)\n' +
            '    append node\n' +
            '    if node.next: heappush(heap, (node.next.val, i, node.next))',
        },
        explanation: "The heap instantly surfaces the smallest next value across all k lists, turning merging into a sequence of O(log k) pop/push operations instead of comparing all heads directly each time.",
      },
      {
        name: 'Find Median from Data Stream',
        bruteForce: { description: 'Insert each number into a sorted array (shifting elements), find the middle.', time: 'O(n) per insert', space: 'O(n)' },
        optimized: {
          description: 'Two heaps — a max-heap for the smaller half, a min-heap for the larger half, kept balanced in size.',
          time: 'O(log n) per insert', space: 'O(n)',
          pseudocode:
            'addNum(x):\n' +
            '    push x into lowHeap (max-heap); move lowHeap.top() into highHeap\n' +
            '    if highHeap bigger than lowHeap: move highHeap.top() back into lowHeap\n' +
            'findMedian(): return lowHeap.top() if odd size, else average of both tops',
        },
        explanation: 'Splitting numbers into "smaller half" and "larger half" heaps means the median always sits at the boundary between them — either the top of one heap, or the average of both tops.',
      },
      {
        name: 'Task Scheduler',
        bruteForce: { description: 'Simulate the schedule minute by minute, picking any available task with remaining count.', time: '~O(n * 26)', space: 'O(1)' },
        optimized: {
          description: 'Max-heap by remaining frequency — always schedule the currently most-frequent available task each cycle.',
          time: '~O(n)', space: 'O(1)',
          pseudocode:
            'heap = max-heap of task counts\n' +
            'time = 0\n' +
            'while heap or cooldownQueue:\n' +
            '    time += 1\n' +
            '    if heap: count = heappop(heap) - 1; if count > 0: cooldownQueue.push((count, time + n))\n' +
            '    if cooldownQueue.front().readyTime == time: heappush(heap, cooldownQueue.pop())',
        },
        explanation: "To minimize idle time, schedule whichever remaining task is currently most frequent first, since it's the one most likely to need cooldown spacing later — a max-heap always hands you exactly that task.",
      },
      {
        name: 'Kth Smallest Element in a Sorted Matrix',
        bruteForce: { description: 'Flatten the entire matrix, sort it, return the kth element.', time: 'O(n^2 log n)', space: 'O(n^2)' },
        optimized: {
          description: 'Min-heap seeded with the first element of each row, expanding candidates as they\'re popped (or binary search on the value range).',
          time: 'O(k log n)', space: 'O(n)',
          pseudocode:
            'heap = [(matrix[i][0], i, 0) for i in range(n)]\n' +
            'heapify(heap)\n' +
            'for _ in range(k - 1):\n' +
            '    val, r, c = heappop(heap)\n' +
            '    if c + 1 < n: heappush(heap, (matrix[r][c+1], r, c+1))\n' +
            'return heappop(heap)[0]',
        },
        explanation: 'Because both rows and columns are sorted, a min-heap seeded with one candidate per row always has the true next-smallest at its top, letting you pop exactly k times instead of sorting everything.',
      },
      {
        name: 'K Closest Points to Origin',
        bruteForce: { description: 'Compute every distance, sort all points by distance, take the first k.', time: 'O(n log n)', space: 'O(n)' },
        optimized: {
          description: 'Max-heap of size k — push points, pop the farthest whenever the heap exceeds size k.',
          time: 'O(n log k)', space: 'O(k)',
          pseudocode:
            'heap = []\n' +
            'for p in points:\n' +
            '    heappush(heap, (-distSq(p), p))\n' +
            '    if len(heap) > k: heappop(heap)\n' +
            'return [p for _, p in heap]',
        },
        explanation: 'Keeping only the k closest points seen so far in a max-heap means a new closer point kicks out the current farthest of those k — the full list is never sorted.',
      },
      {
        name: 'Reorganize String',
        bruteForce: { description: 'Try every permutation of characters, check for no two adjacent identical characters.', time: 'O(n!)', space: 'O(n)' },
        optimized: {
          description: 'Max-heap by frequency — always place the currently most-frequent remaining character next (unless it repeats the last one placed).',
          time: 'O(n log k)', space: 'O(k)',
          pseudocode:
            'heap = max-heap of (count, char)\n' +
            'prev = None\n' +
            'while heap:\n' +
            '    count, char = heappop(heap)\n' +
            '    result.append(char)\n' +
            '    if prev and prev.count > 0: heappush(heap, prev)\n' +
            '    prev = (count - 1, char)',
        },
        explanation: 'Greedily placing whichever character is currently most frequent (while avoiding a repeat) spreads common characters out as evenly as possible — exactly what prevents any two identical ones from ending up adjacent.',
      },
      {
        name: 'Ugly Number II',
        bruteForce: { description: 'Check every integer from 1 upward for whether its only prime factors are 2, 3, 5.', time: 'O(n * result value)', space: 'O(1)' },
        optimized: {
          description: 'Min-heap (or three pointers) generating ugly numbers directly by multiplying earlier ones by 2, 3, and 5, always taking the smallest next candidate.',
          time: 'O(n log n)', space: 'O(n)',
          pseudocode:
            'ugly = [1]; i2 = i3 = i5 = 0\n' +
            'while len(ugly) < n:\n' +
            '    next = min(ugly[i2]*2, ugly[i3]*3, ugly[i5]*5)\n' +
            '    ugly.append(next)\n' +
            '    if next == ugly[i2]*2: i2 += 1\n' +
            '    if next == ugly[i3]*3: i3 += 1\n' +
            '    if next == ugly[i5]*5: i5 += 1',
        },
        explanation: 'Every ugly number beyond the first is an earlier one multiplied by 2, 3, or 5, so generating the sequence directly (always picking the smallest untried product) beats testing every integer for ugliness.',
      },
      {
        name: 'Meeting Rooms II',
        bruteForce: { description: 'For every meeting, check its overlap against every other meeting to track simultaneous overlaps.', time: 'O(n^2)', space: 'O(1) extra' },
        optimized: {
          description: 'Min-heap of end times, meetings sorted by start; reuse the earliest-ending room if it has freed up by the new start, otherwise push a new one.',
          time: 'O(n log n)', space: 'O(n)',
          pseudocode:
            'sort meetings by start\n' +
            'heap = []  # end times\n' +
            'for start, end in meetings:\n' +
            '    if heap and heap[0] <= start: heappop(heap)\n' +
            '    heappush(heap, end)\n' +
            'return len(heap)',
        },
        explanation: 'The heap always tells you the soonest a room becomes free, so before allocating a new room you check whether that soonest-freeing one is actually free yet — reusing rooms whenever possible.',
      },
      {
        name: 'Find K Pairs with Smallest Sums',
        bruteForce: { description: 'Generate all n*m pairs, compute sums, sort, take the smallest k.', time: 'O(n*m log(n*m))', space: 'O(n*m)' },
        optimized: {
          description: 'Min-heap seeded with early pairings from the first array against the second, expanding neighbors as pairs are popped.',
          time: 'O(k log k)', space: 'O(k)',
          pseudocode:
            'heap = [(nums1[i]+nums2[0], i, 0) for i in range(min(k, len(nums1)))]\n' +
            'while k > 0 and heap:\n' +
            '    s, i, j = heappop(heap); result.append((nums1[i], nums2[j])); k -= 1\n' +
            '    if j + 1 < len(nums2): heappush(heap, (nums1[i]+nums2[j+1], i, j+1))',
        },
        explanation: "Because both arrays are sorted, the smallest-sum pairs cluster near the front of both, so a heap that only expands the next candidate from whatever's just popped avoids generating every combination.",
      },
      {
        name: 'Employee Free Time',
        bruteForce: { description: "Build a full timeline marking every minute busy or free across all schedules, scan for free stretches.", time: 'O(range * n)', space: 'O(range)' },
        optimized: {
          description: 'Merge all intervals across employees using a heap or sort by start time; any gap between consecutive merged intervals is free time.',
          time: 'O(n log n)', space: 'O(n)',
          pseudocode:
            'intervals = flatten all schedules; sort by start\n' +
            'merged = [intervals[0]]\n' +
            'for iv in intervals[1:]:\n' +
            '    if iv.start <= merged[-1].end: merged[-1].end = max(merged[-1].end, iv.end)\n' +
            '    else: merged.append(iv)\n' +
            'gaps = [(merged[i].end, merged[i+1].start) for i in range(len(merged)-1)]',
        },
        explanation: "Once every employee's busy intervals are merged into one combined timeline, any gap left between consecutive merged intervals is, by definition, a time nobody at all is busy.",
      },
      {
        name: 'IPO (Maximize Capital)',
        bruteForce: { description: 'At each step, scan every available project for one with capital requirement ≤ current capital and highest profit; repeat k times.', time: 'O(k*n)', space: 'O(1) extra' },
        optimized: {
          description: 'Sort projects by capital requirement; max-heap of profits among currently affordable projects, unlocking newly affordable ones as capital grows.',
          time: 'O(n log n)', space: 'O(n)',
          pseudocode:
            'sort projects by capital requirement\n' +
            'maxProfitHeap = []; i = 0\n' +
            'repeat k times:\n' +
            '    while i < n and projects[i].capital <= w: heappush(maxProfitHeap, -projects[i].profit); i += 1\n' +
            '    if not maxProfitHeap: break\n' +
            '    w += -heappop(maxProfitHeap)',
        },
        explanation: 'Sorting by capital requirement unlocks newly affordable projects incrementally as capital grows, and a max-heap always hands you the most profitable currently-affordable one instantly.',
      },
      {
        name: 'Sort Characters By Frequency',
        bruteForce: { description: 'Count frequencies, repeatedly scan for the remaining highest-frequency character and append it.', time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'Count frequencies with a hash map, then a max-heap (or bucket sort by frequency) builds the result from highest to lowest.',
          time: 'O(n log k)', space: 'O(n)',
          pseudocode:
            'counts = frequency_map(s)\n' +
            'heap = [(-freq, char) for char, freq in counts.items()]; heapify(heap)\n' +
            'result = ""\n' +
            'while heap: freq, char = heappop(heap); result += char * (-freq)',
        },
        explanation: 'Once every character\'s count is known, a max-heap hands you characters in descending frequency order directly — building the output is just repeated pop-and-append.',
      },
      {
        name: 'Last Stone Weight',
        bruteForce: { description: 'On each round, scan the whole array for the two largest stones, replace with the difference, repeat.', time: 'O(n^2)', space: 'O(1) extra' },
        optimized: {
          description: 'Max-heap — repeatedly pop the two largest, push their difference back if nonzero, until one or zero stones remain.',
          time: 'O(n log n)', space: 'O(n)',
          pseudocode:
            'heap = max-heap of stones\n' +
            'while len(heap) > 1:\n' +
            '    a = heappop(heap); b = heappop(heap)\n' +
            '    if a != b: heappush(heap, a - b)\n' +
            'return heap[0] if heap else 0',
        },
        explanation: 'A max-heap instantly hands you the two heaviest remaining stones without rescanning the whole collection, so each "smash" is two pops, a subtraction, and one push.',
      },
    ],
  },
  {
    name: 'Graphs',
    problems: [
      {
        name: 'Number of Islands',
        bruteForce: { description: 'For every land cell, do a full grid scan to check connectivity.', time: 'O((rows*cols)^2)', space: 'O(1)' },
        optimized: {
          description: 'DFS/BFS flood-fill from each unvisited land cell, marking all connected land visited, counting the fills started.',
          time: 'O(rows*cols)', space: 'O(rows*cols)',
          pseudocode:
            'count = 0\n' +
            'for r, c in grid:\n' +
            '    if grid[r][c] == "1" and not visited[r][c]:\n' +
            '        count += 1\n' +
            '        flood_fill(r, c)  # mark all connected land visited',
        },
        explanation: 'Every unvisited land cell you hit must be a brand-new island, and flood-filling from it marks all connected land as visited, guaranteeing no island is ever counted twice.',
      },
      {
        name: 'Clone Graph',
        bruteForce: { description: 'Traverse the graph building copies without tracking already-cloned nodes (breaks on cycles).', time: 'invalid without a map', space: '—' },
        optimized: {
          description: 'DFS or BFS with a hash map from original node to cloned node, so cycles/revisits reuse the existing clone.',
          time: 'O(V+E)', space: 'O(V)',
          pseudocode:
            'clones = {}\n' +
            'def clone(node):\n' +
            '    if node in clones: return clones[node]\n' +
            '    copy = Node(node.val); clones[node] = copy\n' +
            '    copy.neighbors = [clone(n) for n in node.neighbors]\n' +
            '    return copy',
        },
        explanation: 'The hash map is what prevents infinite loops on cycles — before cloning a node, check whether a copy already exists and reuse that reference instead of duplicating it.',
      },
      {
        name: 'Course Schedule (Topological Sort)',
        bruteForce: { description: "Repeatedly try to find and remove a course with no remaining prerequisites; getting stuck means a cycle.", time: 'O(V^2)', space: 'O(V)' },
        optimized: {
          description: "Kahn's algorithm — compute in-degrees, queue zero-in-degree nodes, remove them and decrement neighbors' in-degrees.",
          time: 'O(V+E)', space: 'O(V)',
          pseudocode:
            'inDegree = compute_in_degrees(graph)\n' +
            'queue = [n for n in nodes if inDegree[n] == 0]\n' +
            'taken = 0\n' +
            'while queue:\n' +
            '    n = queue.pop(); taken += 1\n' +
            '    for neighbor in graph[n]:\n' +
            '        inDegree[neighbor] -= 1\n' +
            '        if inDegree[neighbor] == 0: queue.push(neighbor)\n' +
            'return taken == totalCourses',
        },
        explanation: 'A course can only be taken once all its prerequisites are done — exactly what "in-degree reaches zero" means — so processing in that order either finishes everyone or gets stuck, and getting stuck means a cycle.',
      },
      {
        name: 'Pacific Atlantic Water Flow',
        bruteForce: { description: 'For every cell, simulate water flowing from it to check if it reaches both oceans.', time: 'O((rows*cols)^2)', space: 'O(rows*cols)' },
        optimized: {
          description: "BFS/DFS inward from each ocean's border cells (flowing uphill), mark reachable cells for each ocean, intersect the two sets.",
          time: 'O(rows*cols)', space: 'O(rows*cols)',
          pseudocode:
            'pacific = flood_fill_uphill(from top+left border cells)\n' +
            'atlantic = flood_fill_uphill(from bottom+right border cells)\n' +
            'return pacific & atlantic  # cells reachable from both',
        },
        explanation: "Instead of checking whether a cell can reach the ocean, it's cheaper to flood-fill backward from the ocean's edges — a cell both floods can reach is the answer.",
      },
      {
        name: 'Word Ladder',
        bruteForce: { description: 'Try every possible one-letter transformation of the current word at each step, checking against the full word list.', time: 'O(n^2 * L)', space: 'O(n)' },
        optimized: {
          description: 'BFS over the word graph, where each step is a one-letter change to an existing dictionary word.',
          time: 'O(n * L^2)', space: 'O(n)',
          pseudocode:
            'queue = [(beginWord, 1)]; visited = {beginWord}\n' +
            'while queue:\n' +
            '    word, steps = queue.pop()\n' +
            '    if word == endWord: return steps\n' +
            '    for each one-letter variant v of word:\n' +
            '        if v in wordList and v not in visited: visited.add(v); queue.push((v, steps+1))',
        },
        explanation: "Because every transformation costs exactly one step, BFS's level-by-level expansion guarantees the first time you reach the target, you did so in the fewest possible steps.",
      },
      {
        name: 'Graph Valid Tree',
        bruteForce: { description: 'Check all n−1 edges exist AND manually verify connectivity by exploring from every node.', time: 'O(V*(V+E))', space: 'O(V)' },
        optimized: {
          description: 'A graph with n nodes is a valid tree iff it has exactly n−1 edges and is fully connected — verify with one BFS/DFS or Union-Find pass.',
          time: 'O(V+E)', space: 'O(V)',
          pseudocode:
            'if len(edges) != n - 1: return False\n' +
            'dsu = DisjointSet(n)\n' +
            'for a, b in edges:\n' +
            '    if not dsu.union(a, b): return False  # already connected -> cycle\n' +
            'return True',
        },
        explanation: '"No cycles + connected" is equivalent to "exactly n−1 edges + connected" for an n-node graph, so one traversal (or union-find) checks both conditions at once.',
      },
      {
        name: "Dijkstra's Shortest Path",
        bruteForce: { description: 'Relax all edges V times (Bellman-Ford style) without prioritizing which node to process next.', time: 'O(V*E)', space: 'O(V)' },
        optimized: {
          description: 'Min-heap always processing the currently-closest unvisited node next, relaxing its neighbors.',
          time: 'O((V+E) log V)', space: 'O(V)',
          pseudocode:
            'dist = {source: 0}; heap = [(0, source)]\n' +
            'while heap:\n' +
            '    d, u = heappop(heap)\n' +
            '    if d > dist.get(u, inf): continue\n' +
            '    for v, w in graph[u]:\n' +
            '        if d + w < dist.get(v, inf): dist[v] = d + w; heappush(heap, (d+w, v))',
        },
        explanation: 'Since all edge weights are non-negative, the shortest distance to the closest remaining node can never improve later, so a priority queue always expanding the current closest node locks in that node\'s final distance the moment it\'s popped.',
      },
      {
        name: 'Union-Find Basics',
        bruteForce: { description: 'To check if two nodes are connected, run a full BFS/DFS between them every time.', time: 'O(V+E) per query', space: 'O(V)' },
        optimized: {
          description: 'Disjoint Set Union with path compression and union by rank — find() and union() are both nearly O(1) amortized.',
          time: '~O(α(n))', space: 'O(V)',
          pseudocode:
            'def find(x):\n' +
            '    if parent[x] != x: parent[x] = find(parent[x])  # path compression\n' +
            '    return parent[x]\n' +
            'def union(a, b):\n' +
            '    ra, rb = find(a), find(b)\n' +
            '    if ra != rb: attach smaller rank tree under the larger',
        },
        explanation: "Path compression flattens the parent chain on every lookup, so instead of re-exploring the graph for every connectivity query, future lookups for the same nodes become almost instant.",
      },
      {
        name: 'Rotting Oranges',
        bruteForce: { description: 'Repeatedly scan the entire grid each minute, spreading rot to adjacent fresh oranges.', time: 'O((rows*cols)^2)', space: 'O(rows*cols)' },
        optimized: {
          description: 'Multi-source BFS — enqueue all initially rotten oranges at once, spread level by level, counting minutes.',
          time: 'O(rows*cols)', space: 'O(rows*cols)',
          pseudocode:
            'queue = [all initially rotten cells]; minutes = 0\n' +
            'while queue and freshCount > 0:\n' +
            '    minutes += 1\n' +
            '    for each rotten cell popped this round: rot adjacent fresh cells, enqueue them, freshCount -= 1\n' +
            'return minutes if freshCount == 0 else -1',
        },
        explanation: 'Starting BFS from all rotten oranges simultaneously means each BFS level corresponds exactly to one minute passing, so counting levels directly counts the minutes needed.',
      },
      {
        name: 'Redundant Connection',
        bruteForce: { description: 'For each edge added, run a full DFS/BFS to check whether the endpoints were already connected before this edge.', time: 'O(V*E)', space: 'O(V)' },
        optimized: {
          description: 'Union-Find — process edges in order; the first edge trying to union two nodes already in the same set is the redundant one.',
          time: '~O(E α(V))', space: 'O(V)',
          pseudocode:
            'dsu = DisjointSet(n)\n' +
            'for a, b in edges:\n' +
            '    if not dsu.union(a, b): return [a, b]  # already same set -> redundant',
        },
        explanation: 'Union-Find directly tracks which nodes are already connected, so the first edge whose endpoints are already in the same group must be the one creating a cycle.',
      },
      {
        name: 'Network Delay Time',
        bruteForce: { description: 'Bellman-Ford style — relax all edges repeatedly V−1 times without any priority ordering.', time: 'O(V*E)', space: 'O(V)' },
        optimized: {
          description: "Dijkstra's algorithm with a min-heap, tracking shortest time to reach each node from the source.",
          time: 'O((V+E) log V)', space: 'O(V)',
          pseudocode:
            'dist = {source: 0}; heap = [(0, source)]\n' +
            'while heap:\n' +
            '    d, u = heappop(heap)\n' +
            '    for v, w in graph[u]:\n' +
            '        if d + w < dist.get(v, inf): dist[v] = d+w; heappush(heap, (d+w, v))\n' +
            'return max(dist.values()) if len(dist) == n else -1',
        },
        explanation: 'This is a direct Dijkstra application — since travel times are non-negative, always expanding the currently-closest unvisited node guarantees its shortest distance the instant it\'s popped.',
      },
      {
        name: 'Cheapest Flights Within K Stops',
        bruteForce: { description: 'DFS/BFS exploring every possible path up to k stops, tracking the minimum cost.', time: 'exponential in k', space: 'O(V)' },
        optimized: {
          description: 'Bellman-Ford limited to k+1 iterations, using a snapshot of the previous iteration\'s distances so one round doesn\'t use updates from itself.',
          time: 'O(k*E)', space: 'O(V)',
          pseudocode:
            'dist = {src: 0}\n' +
            'for _ in range(k + 1):\n' +
            '    prev = dist.copy()\n' +
            '    for u, v, price in flights:\n' +
            '        if u in prev and prev[u] + price < dist.get(v, inf): dist[v] = prev[u] + price\n' +
            'return dist.get(dst, -1)',
        },
        explanation: 'Each Bellman-Ford relaxation round corresponds to allowing one additional flight, so capping it at k+1 rounds directly enforces the "at most k stops" constraint plain Dijkstra can\'t express.',
      },
      {
        name: 'Alien Dictionary',
        bruteForce: { description: 'Try every permutation of the alphabet, checking which is consistent with all words\' relative ordering.', time: 'O(26!)', space: 'O(26)' },
        optimized: {
          description: 'Build a "comes before" graph by comparing adjacent words\' first differing character, then topological sort.',
          time: 'O(total characters)', space: 'O(alphabet size)',
          pseudocode:
            'for w1, w2 in adjacent word pairs:\n' +
            '    find first index where w1[i] != w2[i]\n' +
            '    add edge w1[i] -> w2[i] in graph\n' +
            'return topological_sort(graph)',
        },
        explanation: 'Comparing each pair of adjacent words gives exactly one ordering constraint, and topological sort is precisely the algorithm for turning a set of "must come before" constraints into one consistent order.',
      },
      {
        name: "Minimum Spanning Tree (Kruskal's)",
        bruteForce: { description: 'Try every possible subset of n−1 edges, checking if it forms a connected acyclic tree.', time: 'exponential', space: 'O(V)' },
        optimized: {
          description: 'Sort all edges by weight, greedily add each edge (Union-Find checks for a cycle) until n−1 edges are chosen.',
          time: 'O(E log E)', space: 'O(V)',
          pseudocode:
            'sort edges by weight ascending\n' +
            'dsu = DisjointSet(n); mst = []\n' +
            'for w, a, b in edges:\n' +
            '    if dsu.union(a, b): mst.append((a,b,w))\n' +
            '    if len(mst) == n - 1: break',
        },
        explanation: "Always picking the cheapest remaining edge that doesn't create a cycle (checked instantly via Union-Find) guarantees minimum total weight, since any pricier alternative could only ever be swapped in for something at least as costly.",
      },
      {
        name: 'Bipartite Graph Check',
        bruteForce: { description: 'Try every possible 2-coloring assignment of all nodes and check if any is valid.', time: 'O(2^V)', space: 'O(V)' },
        optimized: {
          description: 'BFS/DFS coloring nodes alternately as you traverse; an edge connecting two same-colored nodes proves it isn\'t bipartite.',
          time: 'O(V+E)', space: 'O(V)',
          pseudocode:
            'color = {}\n' +
            'for start in nodes:\n' +
            '    if start in color: continue\n' +
            '    color[start] = 0; queue = [start]\n' +
            '    while queue:\n' +
            '        u = queue.pop()\n' +
            '        for v in graph[u]:\n' +
            '            if v not in color: color[v] = 1 - color[u]; queue.push(v)\n' +
            '            elif color[v] == color[u]: return False\n' +
            'return True',
        },
        explanation: 'A graph splittable into two groups with no edges within a group must alternate colors along every edge, so coloring greedily and catching any contradiction is enough to prove or disprove bipartiteness.',
      },
    ],
  },
  {
    name: 'Dynamic Programming',
    problems: [
      {
        name: 'Climbing Stairs',
        bruteForce: { description: 'Recursively try both "take 1 step" and "take 2 steps" from every position.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'Bottom-up DP — ways(n) = ways(n−1) + ways(n−2), computed iteratively with two variables.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'a, b = 1, 1\n' +
            'for _ in range(n):\n' +
            '    a, b = b, a + b\n' +
            'return a',
        },
        explanation: 'The last move to reach step n was either a 1-step from n−1 or a 2-step from n−2, so the total ways is the sum of ways to reach those two earlier steps — no re-exploring needed.',
      },
      {
        name: 'House Robber',
        bruteForce: { description: 'Recursively try both "rob" and "skip" at every house.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'DP where rob(i) = max(rob(i−1), rob(i−2) + value[i]), computed with two running variables.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'prev2 = prev1 = 0\n' +
            'for x in nums:\n' +
            '    prev2, prev1 = prev1, max(prev1, prev2 + x)\n' +
            'return prev1',
        },
        explanation: "At each house you either skip it (keeping what you'd already have) or rob it (adding its value to the total from two houses back) — tracking just those two running totals replaces the whole decision tree.",
      },
      {
        name: 'Coin Change',
        bruteForce: { description: 'Recursively try every coin at every remaining amount.', time: 'O(coins^amount)', space: 'O(amount)' },
        optimized: {
          description: 'Bottom-up DP array dp[a] = minimum coins for amount a, built from dp[0]=0 using dp[a] = min(dp[a−coin]+1).',
          time: 'O(amount * coins)', space: 'O(amount)',
          pseudocode:
            'dp = [0] + [infinity] * amount\n' +
            'for a in range(1, amount + 1):\n' +
            '    for coin in coins:\n' +
            '        if coin <= a: dp[a] = min(dp[a], dp[a - coin] + 1)\n' +
            'return dp[amount] if dp[amount] != infinity else -1',
        },
        explanation: 'The minimum coins for amount a only depends on the minimum coins for smaller amounts, so filling a table upward reuses that earlier work instead of recomputing it.',
      },
      {
        name: 'Longest Increasing Subsequence',
        bruteForce: { description: 'Recursively try including or excluding each element, checking all subsequences.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'Maintain an array of smallest possible tail values per subsequence length, binary searching where each new element fits.',
          time: 'O(n log n)', space: 'O(n)',
          pseudocode:
            'tails = []\n' +
            'for x in nums:\n' +
            '    i = binary_search_leftmost(tails, x)\n' +
            '    if i == len(tails): tails.append(x)\n' +
            '    else: tails[i] = x\n' +
            'return len(tails)',
        },
        explanation: 'Binary searching where a new element fits into the "smallest tails" array both extends and improves increasing subsequences in log time, instead of checking all previous elements.',
      },
      {
        name: 'Longest Common Subsequence',
        bruteForce: { description: 'Recursively try all combinations of including/excluding characters from both strings.', time: 'O(2^(n+m))', space: 'O(n+m)' },
        optimized: {
          description: '2D DP table dp[i][j] = LCS of first i and first j characters, filled using matches diagonally or the better of dropping one character.',
          time: 'O(n*m)', space: 'O(n*m)',
          pseudocode:
            'dp = 2D array of zeros, size (n+1) x (m+1)\n' +
            'for i in 1..n:\n' +
            '    for j in 1..m:\n' +
            '        if a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1] + 1\n' +
            '        else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])\n' +
            'return dp[n][m]',
        },
        explanation: "If the current characters match, they're both part of the LCS, extending the answer one back diagonally; if not, the best so far is whichever is better after dropping one character from either string.",
      },
      {
        name: 'Edit Distance',
        bruteForce: { description: 'Recursively try insert/delete/replace at every mismatch.', time: 'O(3^n)', space: 'O(n)' },
        optimized: {
          description: '2D DP table dp[i][j] = edit distance between first i and first j characters, using 1 + min(insert, delete, replace) on a mismatch.',
          time: 'O(n*m)', space: 'O(n*m)',
          pseudocode:
            'dp[i][0] = i; dp[0][j] = j\n' +
            'for i in 1..n:\n' +
            '    for j in 1..m:\n' +
            '        if a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1]\n' +
            '        else: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])',
        },
        explanation: "Every prefix pair's edit distance is built from three smaller subproblems (the cell above, to the left, and diagonally) representing delete, insert, and replace, computed once and reused.",
      },
      {
        name: '0/1 Knapsack',
        bruteForce: { description: 'Recursively try including or excluding each item.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'DP table dp[i][w] = best value using first i items with capacity w, using max(don\'t take, take + value).',
          time: 'O(n * capacity)', space: 'O(capacity)',
          pseudocode:
            'dp = [0] * (capacity + 1)\n' +
            'for weight, value in items:\n' +
            '    for w in range(capacity, weight - 1, -1):\n' +
            '        dp[w] = max(dp[w], dp[w - weight] + value)\n' +
            'return dp[capacity]',
        },
        explanation: "For each item, the best value at a given capacity is either the same as without it, or this item's value plus the best value for the remaining capacity using earlier items — compared at every capacity, bottom-up.",
      },
      {
        name: 'Word Break',
        bruteForce: { description: 'Recursively try every prefix of the remaining string against the dictionary.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'DP where dp[i] = true if s[0..i) is breakable, using an earlier breakable prefix plus one valid dictionary word.',
          time: 'O(n^2)', space: 'O(n)',
          pseudocode:
            'dp = [True] + [False] * n\n' +
            'for i in range(1, n + 1):\n' +
            '    for j in range(i):\n' +
            '        if dp[j] and s[j:i] in wordDict: dp[i] = True; break\n' +
            'return dp[n]',
        },
        explanation: 'A prefix is breakable exactly when some shorter breakable prefix, plus one valid dictionary word, exactly reaches it — reusing that knowledge avoids re-testing every split.',
      },
      {
        name: 'Unique Paths',
        bruteForce: { description: 'Recursively try moving right or down from every cell, counting paths reaching the bottom-right.', time: 'O(2^(m+n))', space: 'O(m+n)' },
        optimized: {
          description: 'DP grid where paths(i,j) = paths(i−1,j) + paths(i,j−1), filled row by row (or a direct combinatorics formula).',
          time: 'O(m*n)', space: 'O(n)',
          pseudocode:
            'row = [1] * cols\n' +
            'for i in range(1, rows):\n' +
            '    for j in range(1, cols):\n' +
            '        row[j] += row[j-1]\n' +
            'return row[cols-1]',
        },
        explanation: 'The number of ways to reach any cell is the sum of the ways to reach the cell above and to the left, since those are the only two cells you could have come from.',
      },
      {
        name: 'Maximum Product Subarray',
        bruteForce: { description: "Check every subarray's product.", time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Track a running max and running min product ending at each position, since a negative number can flip the min into the new max.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'curMax = curMin = best = nums[0]\n' +
            'for x in nums[1:]:\n' +
            '    candidates = (x, curMax*x, curMin*x)\n' +
            '    curMax, curMin = max(candidates), min(candidates)\n' +
            '    best = max(best, curMax)',
        },
        explanation: 'A negative number can turn the smallest running product into the largest one, so tracking the running minimum alongside the maximum, and comparing all three products at each step, catches the flip.',
      },
      {
        name: 'Decode Ways',
        bruteForce: { description: 'Recursively try treating each position as a 1-digit or 2-digit decode.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'DP where dp[i] = dp[i−1] (if the single digit is valid) plus dp[i−2] (if the two digits form a valid code).',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'prev2 = prev1 = 1\n' +
            'for i in range(1, n+1):\n' +
            '    curr = 0\n' +
            '    if s[i-1] != "0": curr += prev1\n' +
            '    if i > 1 and "10" <= s[i-2:i] <= "26": curr += prev2\n' +
            '    prev2, prev1 = prev1, curr\n' +
            'return prev1',
        },
        explanation: 'A prefix\'s decode count only depends on whether its last one or two digits form valid codes, in which case the count is inherited directly from the already-computed shorter answer.',
      },
      {
        name: 'Partition Equal Subset Sum',
        bruteForce: { description: 'Recursively try including or excluding each number, checking if any subset sums to half the total.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: '0/1 knapsack style boolean array dp[s] = achievable, updated per number by iterating sums downward from target.',
          time: 'O(n * sum)', space: 'O(sum)',
          pseudocode:
            'target = sum(nums) / 2  # must be integer\n' +
            'dp = [True] + [False] * target\n' +
            'for x in nums:\n' +
            '    for s in range(target, x - 1, -1):\n' +
            '        dp[s] = dp[s] or dp[s - x]\n' +
            'return dp[target]',
        },
        explanation: 'This is exactly a knapsack problem targeting half the total sum — a number either helps achieve a sum s (if s minus that number was already achievable) or it doesn\'t, and iterating downward avoids reusing a number twice.',
      },
      {
        name: 'Best Time to Buy and Sell Stock with Cooldown',
        bruteForce: { description: 'Recursively try every buy/sell/cooldown decision at every day.', time: '~O(3^n)', space: 'O(n)' },
        optimized: {
          description: 'DP with three states per day (holding, cooldown, free) transitioning off yesterday\'s best value in each state.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'hold, sold, rest = -infinity, 0, 0\n' +
            'for price in prices:\n' +
            '    hold, sold, rest = max(hold, rest - price), hold + price, max(rest, sold)\n' +
            'return max(sold, rest)',
        },
        explanation: "Each day you're in exactly one of three situations, and today's best value for each depends only on yesterday's — three running numbers replace exploring every possible trade sequence.",
      },
      {
        name: 'Regular Expression Matching',
        bruteForce: { description: "Recursively try every way '*' could expand, combined with direct character matches.", time: 'exponential', space: 'O(n+m)' },
        optimized: {
          description: "2D DP table dp[i][j] = whether prefixes match, handling '*' as either 'match zero' or 'match one more of the preceding element'.",
          time: 'O(n*m)', space: 'O(n*m)',
          pseudocode:
            'dp[0][0] = True\n' +
            'for i in 0..n: for j in 1..m:\n' +
            '    if p[j-1] == "*":\n' +
            '        dp[i][j] = dp[i][j-2] or (i > 0 and matches(s[i-1], p[j-2]) and dp[i-1][j])\n' +
            '    else:\n' +
            '        dp[i][j] = i > 0 and matches(s[i-1], p[j-1]) and dp[i-1][j-1]',
        },
        explanation: "A '*' branches into either matching nothing (skip the preceding element) or matching one more occurrence — building a table of these yes/no answers avoids re-exploring the same substring/subpattern pair.",
      },
      {
        name: 'Burst Balloons',
        bruteForce: { description: 'Recursively try bursting balloons in every possible order.', time: 'O(n!)', space: 'O(n)' },
        optimized: {
          description: 'Interval DP — dp[l][r] = max coins bursting everything strictly between l and r, trying every balloon k as the last one burst.',
          time: 'O(n^3)', space: 'O(n^2)',
          pseudocode:
            'nums = [1] + balloons + [1]\n' +
            'for length in 2..len(nums)-1:\n' +
            '    for l in range(0, len(nums)-length):\n' +
            '        r = l + length\n' +
            '        for k in range(l+1, r):\n' +
            '            dp[l][r] = max(dp[l][r], dp[l][k] + nums[l]*nums[k]*nums[r] + dp[k][r])',
        },
        explanation: 'Fixing which balloon is burst *last* in a range splits it into two independent sub-ranges whose optimal answers are already computed, since order within each sub-range no longer interacts with the other.',
      },
    ],
  },
  {
    name: 'Backtracking',
    problems: [
      {
        name: 'Subsets',
        bruteForce: { description: 'Generate all 2^n bitmask combinations, checking which bits are set.', time: 'O(n * 2^n)', space: 'O(n * 2^n)' },
        optimized: {
          description: 'Recursive backtracking — branch into "include" and "exclude" at each element, recording the current subset at every call.',
          time: 'O(n * 2^n)', space: 'O(n)',
          pseudocode:
            'def backtrack(i, path):\n' +
            '    if i == n: result.append(path.copy()); return\n' +
            '    backtrack(i+1, path)                 # exclude\n' +
            '    path.append(nums[i]); backtrack(i+1, path); path.pop()  # include',
        },
        explanation: 'Every subset corresponds to a sequence of include/exclude decisions for each element, so recursively branching on each element naturally enumerates them all.',
      },
      {
        name: 'Permutations',
        bruteForce: { description: 'Generate all n! orderings by repeated swapping without early pruning.', time: 'O(n * n!)', space: 'O(n)' },
        optimized: {
          description: 'Recursive backtracking — build one position at a time, tracking used elements, undoing the choice after each branch.',
          time: 'O(n * n!)', space: 'O(n)',
          pseudocode:
            'def backtrack(path, used):\n' +
            '    if len(path) == n: result.append(path.copy()); return\n' +
            '    for x in nums:\n' +
            '        if x in used: continue\n' +
            '        path.append(x); used.add(x)\n' +
            '        backtrack(path, used)\n' +
            '        path.pop(); used.remove(x)',
        },
        explanation: 'At each position, try every unused number, recurse to fill the rest, then undo before trying the next candidate — systematically covering every ordering without duplicated work.',
      },
      {
        name: 'Combination Sum',
        bruteForce: { description: 'Try every possible combination of candidate counts up to the target.', time: 'exponential', space: 'O(target/min)' },
        optimized: {
          description: 'Recursive backtracking that reuses candidates while the running sum stays ≤ target, backtracking once it\'s exceeded.',
          time: 'O(2^target) worst case', space: 'O(target)',
          pseudocode:
            'def backtrack(start, remaining, path):\n' +
            '    if remaining == 0: result.append(path.copy()); return\n' +
            '    if remaining < 0: return\n' +
            '    for i in range(start, len(candidates)):\n' +
            '        path.append(candidates[i])\n' +
            '        backtrack(i, remaining - candidates[i], path)  # i, not i+1: reuse allowed\n' +
            '        path.pop()',
        },
        explanation: 'Backtracking the moment the remaining target goes negative prunes branches early, instead of exploring them fully first.',
      },
      {
        name: 'Word Search',
        bruteForce: { description: 'Check every possible path of matching characters without tracking visited cells.', time: 'O(rows*cols*4^L)', space: 'O(L)' },
        optimized: {
          description: 'DFS/backtracking marking cells visited temporarily, un-marking them (backtrack) when a path fails.',
          time: 'O(rows*cols*4^L)', space: 'O(L)',
          pseudocode:
            'def dfs(r, c, i):\n' +
            '    if i == len(word): return True\n' +
            '    if out of bounds or visited[r][c] or grid[r][c] != word[i]: return False\n' +
            '    visited[r][c] = True\n' +
            '    found = any(dfs(nr, nc, i+1) for each neighbor)\n' +
            '    visited[r][c] = False\n' +
            '    return found',
        },
        explanation: 'Marking a cell visited during the current path prevents reusing it, and un-marking it right after backtracking frees it for a different path explored from elsewhere.',
      },
      {
        name: 'N-Queens',
        bruteForce: { description: 'Try every possible placement of n queens, checking all of them for conflicts afterward.', time: 'O(n^(2n))', space: 'O(n^2)' },
        optimized: {
          description: 'Backtracking placing one queen per row, checking column/diagonal conflicts before placing, backtracking on conflict.',
          time: '~O(n!)', space: 'O(n)',
          pseudocode:
            'def backtrack(row, cols, diag1, diag2):\n' +
            '    if row == n: record solution; return\n' +
            '    for col in range(n):\n' +
            '        if col in cols or (row-col) in diag1 or (row+col) in diag2: continue\n' +
            '        place queen; backtrack(row+1, ...); remove queen',
        },
        explanation: 'Checking conflicts immediately (rather than after placing all queens) prunes invalid placements the instant they become invalid, avoiding the waste of fully placing a doomed board.',
      },
      {
        name: 'Generate Parentheses',
        bruteForce: { description: "Generate all 2^(2n) strings of '(' and ')', then filter for validity.", time: 'O(2^(2n) * n)', space: 'O(2^(2n) * n)' },
        optimized: {
          description: "Backtracking that only adds '(' if fewer than n opens are used, and only adds ')' if it wouldn't exceed the current open count.",
          time: '~O(4^n / sqrt(n))', space: 'O(n)',
          pseudocode:
            'def backtrack(path, open, close):\n' +
            '    if len(path) == 2*n: result.append("".join(path)); return\n' +
            '    if open < n: path.append("("); backtrack(path, open+1, close); path.pop()\n' +
            '    if close < open: path.append(")"); backtrack(path, open, close+1); path.pop()',
        },
        explanation: 'Only allowing a closing bracket when a matching unclosed opening bracket exists means the backtracking never generates an invalid string to begin with, instead of generating and filtering.',
      },
      {
        name: 'Palindrome Partitioning',
        bruteForce: { description: 'Try every possible way to split the string, checking each substring for palindrome-ness.', time: 'O(2^n * n)', space: 'O(n)' },
        optimized: {
          description: 'Backtracking that only recurses into a substring choice if that piece is already a palindrome.',
          time: 'O(2^n * n) worst case, heavily pruned', space: 'O(n)',
          pseudocode:
            'def backtrack(start, path):\n' +
            '    if start == len(s): result.append(path.copy()); return\n' +
            '    for end in range(start+1, len(s)+1):\n' +
            '        piece = s[start:end]\n' +
            '        if is_palindrome(piece):\n' +
            '            path.append(piece); backtrack(end, path); path.pop()',
        },
        explanation: 'Checking whether the next candidate piece is a palindrome before recursing avoids exploring any partition path already doomed by an invalid first piece.',
      },
      {
        name: 'Combinations (choose k of n)',
        bruteForce: { description: 'Generate all 2^n subsets and filter for those of size k.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'Backtracking that only recurses forward, stopping once the combination reaches size k, pruning when there aren\'t enough numbers left.',
          time: 'O(C(n,k) * k)', space: 'O(k)',
          pseudocode:
            'def backtrack(start, path):\n' +
            '    if len(path) == k: result.append(path.copy()); return\n' +
            '    for x in range(start, n+1):\n' +
            '        if n - x + 1 < k - len(path): break  # not enough left\n' +
            '        path.append(x); backtrack(x+1, path); path.pop()',
        },
        explanation: 'Only choosing numbers larger than the last one picked guarantees each combination is generated exactly once, and pruning branches without enough remaining numbers avoids wasted exploration.',
      },
      {
        name: 'Letter Combinations of a Phone Number',
        bruteForce: { description: "Precompute all combinations with nested loops, one loop per digit's letter set.", time: 'O(4^n)', space: 'O(4^n)' },
        optimized: {
          description: "Backtracking that appends one digit's letter to a running combination, recursing to the next digit, removing it after.",
          time: 'O(4^n)', space: 'O(n)',
          pseudocode:
            'def backtrack(i, path):\n' +
            '    if i == len(digits): result.append("".join(path)); return\n' +
            '    for letter in mapping[digits[i]]:\n' +
            '        path.append(letter); backtrack(i+1, path); path.pop()',
        },
        explanation: 'Recursion handles "any number of digits" for free by treating each digit as one more level of branching, appending a candidate letter, recursing, then undoing before trying the next.',
      },
      {
        name: 'Subsets II (with duplicates)',
        bruteForce: { description: 'Generate all 2^n subsets, dedupe with a hash set.', time: 'O(n * 2^n)', space: 'O(n * 2^n)' },
        optimized: {
          description: 'Sort the array first, backtrack normally but skip a duplicate value at the same recursion depth unless it\'s the first occurrence there.',
          time: 'O(n * 2^n)', space: 'O(n)',
          pseudocode:
            'nums.sort()\n' +
            'def backtrack(start, path):\n' +
            '    result.append(path.copy())\n' +
            '    for i in range(start, n):\n' +
            '        if i > start and nums[i] == nums[i-1]: continue\n' +
            '        path.append(nums[i]); backtrack(i+1, path); path.pop()',
        },
        explanation: 'Sorting groups duplicates together, so once you\'ve decided to skip a value at a branching point, skipping every identical value right after it (at that same depth) prevents duplicate subsets.',
      },
      {
        name: 'Permutations II (with duplicates)',
        bruteForce: { description: 'Generate all n! permutations, dedupe with a hash set.', time: 'O(n * n!)', space: 'O(n * n!)' },
        optimized: {
          description: 'Sort the array, backtrack skipping a duplicate value at the same level unless the previous identical value has already been used in this branch.',
          time: 'O(n * n!)', space: 'O(n)',
          pseudocode:
            'nums.sort()\n' +
            'def backtrack(path, used):\n' +
            '    if len(path) == n: result.append(path.copy()); return\n' +
            '    for i in range(n):\n' +
            '        if used[i]: continue\n' +
            '        if i > 0 and nums[i]==nums[i-1] and not used[i-1]: continue\n' +
            '        used[i]=True; path.append(nums[i]); backtrack(path, used); path.pop(); used[i]=False',
        },
        explanation: 'This condition ensures identical values are always placed in the same relative order across every generated permutation, which is exactly what eliminates duplicate outputs.',
      },
      {
        name: 'Sudoku Solver',
        bruteForce: { description: 'Try every digit in every empty cell without checking constraints until the whole board is filled.', time: 'astronomically large', space: 'O(1)' },
        optimized: {
          description: "Backtracking that places a digit only if it doesn't violate row/column/box constraints, undoing if no digit leads to a solution.",
          time: 'exponential, heavily pruned', space: 'O(1) extra',
          pseudocode:
            'def solve():\n' +
            '    find empty cell (r, c); if none: return True\n' +
            '    for d in "1".."9":\n' +
            '        if valid(r, c, d):\n' +
            '            place d; if solve(): return True\n' +
            '            remove d\n' +
            '    return False',
        },
        explanation: 'Checking validity before placing each digit prunes the overwhelming majority of invalid boards immediately, rather than the huge waste of filling an entire board and only then finding it invalid.',
      },
      {
        name: 'Restore IP Addresses',
        bruteForce: { description: 'Try every possible way to insert 3 dots, generating all splits and validating afterward.', time: 'O(n^3)', space: 'O(n)' },
        optimized: {
          description: 'Backtracking that only recurses into a 1-3 digit segment if it\'s already a valid octet, pruning invalid segments immediately.',
          time: 'bounded at ~3^4 candidates', space: 'O(n)',
          pseudocode:
            'def backtrack(start, parts):\n' +
            '    if len(parts) == 4: if start == len(s): result.append(".".join(parts)); return\n' +
            '    for length in 1..3:\n' +
            '        segment = s[start:start+length]\n' +
            '        if is_valid_octet(segment):\n' +
            '            backtrack(start+length, parts + [segment])',
        },
        explanation: 'Validating each segment as you choose it (rather than after building the whole address) means invalid branches are never even attempted, since there are only ever 4 segments with at most 3 choices each.',
      },
      {
        name: 'Matchsticks to Square',
        bruteForce: { description: 'Try every way of partitioning matchsticks into 4 groups, check if all 4 sums are equal.', time: 'O(4^n)', space: 'O(n)' },
        optimized: {
          description: 'Backtracking placing each stick (largest-first) into one of 4 running side-sums, skipping equal-length sides already tried and failed.',
          time: 'O(4^n), heavily pruned', space: 'O(4)',
          pseudocode:
            'sticks.sort(reverse=True); side = target = sum(sticks) / 4\n' +
            'def backtrack(i, sides):\n' +
            '    if i == len(sticks): return all(s == target for s in sides)\n' +
            '    triedLengths = set()\n' +
            '    for j in range(4):\n' +
            '        if sides[j] + sticks[i] <= target and sides[j] not in triedLengths:\n' +
            '            triedLengths.add(sides[j]); sides[j] += sticks[i]\n' +
            '            if backtrack(i+1, sides): return True\n' +
            '            sides[j] -= sticks[i]\n' +
            '    return False',
        },
        explanation: 'Sorting sticks largest-first surfaces failures earlier, and skipping a side that\'s currently the same length as one just tried avoids redundantly exploring symmetric, equivalent placements.',
      },
      {
        name: 'Palindrome Partitioning II (minimum cuts)',
        bruteForce: { description: 'Try every possible partition, counting cuts for each fully valid palindrome partition.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'Precompute a palindrome table via DP, then a second DP array for minimum cuts, trying every valid last-palindrome-piece.',
          time: 'O(n^2)', space: 'O(n^2)',
          pseudocode:
            'isPal[i][j] = precompute via DP (isPal[i][j] = s[i]==s[j] and isPal[i+1][j-1])\n' +
            'cuts[0] = -1\n' +
            'for i in 1..n:\n' +
            '    cuts[i] = min(cuts[j] + 1 for j in 0..i-1 if isPal[j][i-1])',
        },
        explanation: 'Precomputing which substrings are palindromes turns an expensive repeated check into an O(1) lookup, so the second DP pass only tries each possible last piece once instead of re-verifying palindromes from scratch.',
      },
    ],
  },
  {
    name: 'Greedy',
    problems: [
      {
        name: 'Jump Game',
        bruteForce: { description: 'Recursively try every possible jump length from every position.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'Greedily track the furthest reachable index while scanning left to right; fail if the current index ever exceeds that reach.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'reach = 0\n' +
            'for i, x in enumerate(nums):\n' +
            '    if i > reach: return False\n' +
            '    reach = max(reach, i + x)\n' +
            'return True',
        },
        explanation: 'You never need to know which specific path reaches a given index, only the furthest reach it enables — a single running value answers reachability.',
      },
      {
        name: 'Gas Station',
        bruteForce: { description: 'Try starting from every station and simulate the full loop for feasibility.', time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Track a running tank total; if it goes negative, reset the candidate start to the next station.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'total = tank = start = 0\n' +
            'for i in range(n):\n' +
            '    diff = gas[i] - cost[i]\n' +
            '    total += diff; tank += diff\n' +
            '    if tank < 0: start = i + 1; tank = 0\n' +
            'return start if total >= 0 else -1',
        },
        explanation: 'If the tank goes negative between stations i and j, none of the stations between them could work either (they\'d run out even sooner), so you can skip straight past all of them.',
      },
      {
        name: 'Merge Intervals',
        bruteForce: { description: 'Repeatedly scan all pairs for overlaps and merge, restarting after every merge.', time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'Sort by start time, then a single pass merging any interval overlapping the last one added.',
          time: 'O(n log n)', space: 'O(n)',
          pseudocode:
            'intervals.sort(key=start)\n' +
            'merged = [intervals[0]]\n' +
            'for iv in intervals[1:]:\n' +
            '    if iv.start <= merged[-1].end: merged[-1].end = max(merged[-1].end, iv.end)\n' +
            '    else: merged.append(iv)',
        },
        explanation: 'Once sorted by start time, an overlap can only happen between an interval and the immediately preceding one in the result, so one left-to-right pass suffices.',
      },
      {
        name: 'Non-overlapping Intervals',
        bruteForce: { description: 'Try every subset of intervals, checking for non-overlap.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'Sort by end time, greedily keep an interval if it starts after the previous kept interval ends.',
          time: 'O(n log n)', space: 'O(1) extra',
          pseudocode:
            'intervals.sort(key=end)\n' +
            'removed = 0; prevEnd = -infinity\n' +
            'for iv in intervals:\n' +
            '    if iv.start >= prevEnd: prevEnd = iv.end\n' +
            '    else: removed += 1',
        },
        explanation: 'Sorting by end time and always keeping whichever interval finishes earliest leaves the most room for future intervals to also fit, minimizing removals.',
      },
      {
        name: 'Partition Labels',
        bruteForce: { description: 'Try every partition boundary, checking each letter\'s occurrences are confined to one partition.', time: 'O(n^2)', space: 'O(n)' },
        optimized: {
          description: 'Precompute the last occurrence index of every character, then extend the current partition to the max last-occurrence seen so far.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'lastIndex = {c: i for i, c in enumerate(s)}\n' +
            'start = end = 0\n' +
            'for i, c in enumerate(s):\n' +
            '    end = max(end, lastIndex[c])\n' +
            '    if i == end: result.append(end - start + 1); start = i + 1',
        },
        explanation: 'A partition can only end once every character inside it has had its last appearance, so tracking the furthest "last occurrence" among characters seen so far tells you exactly when to cut.',
      },
      {
        name: 'Meeting Rooms',
        bruteForce: { description: 'Compare every pair of meetings for overlap.', time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Sort by start time, check that each meeting starts no earlier than the previous meeting\'s end.',
          time: 'O(n log n)', space: 'O(1) extra',
          pseudocode:
            'intervals.sort(key=start)\n' +
            'for i in range(1, len(intervals)):\n' +
            '    if intervals[i].start < intervals[i-1].end: return False\n' +
            'return True',
        },
        explanation: 'Sorted by start time, an overlap can only occur between consecutive meetings, so a single pass comparing each to the previous catches every possible overlap.',
      },
      {
        name: 'Best Time to Buy and Sell Stock II',
        bruteForce: { description: 'Recursively try every combination of buy/sell days.', time: 'O(2^n)', space: 'O(n)' },
        optimized: {
          description: 'Sum up every positive day-to-day price difference.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'profit = 0\n' +
            'for i in range(1, n):\n' +
            '    if prices[i] > prices[i-1]: profit += prices[i] - prices[i-1]\n' +
            'return profit',
        },
        explanation: 'Any profitable multi-day price rise decomposes into a sum of single-day rises, so summing every positive consecutive difference captures the max profit without tracking actual buy/sell days.',
      },
      {
        name: 'Assign Cookies',
        bruteForce: { description: 'For every child, scan remaining cookies for one that satisfies them.', time: 'O(n*m)', space: 'O(1) extra' },
        optimized: {
          description: 'Sort both greed factors and cookie sizes, greedily match the smallest available cookie to the smallest unsatisfied child.',
          time: 'O(n log n + m log m)', space: 'O(1) extra',
          pseudocode:
            'greed.sort(); cookies.sort()\n' +
            'i = j = satisfied = 0\n' +
            'while i < len(greed) and j < len(cookies):\n' +
            '    if cookies[j] >= greed[i]: satisfied += 1; i += 1\n' +
            '    j += 1',
        },
        explanation: 'Satisfying the least-demanding child first with the smallest working cookie preserves larger cookies for children who actually need them, maximizing how many can be satisfied overall.',
      },
      {
        name: 'Lemonade Change',
        bruteForce: { description: 'Simulate transaction history tracking possible bill combinations for every change requirement.', time: 'O(n), complex bookkeeping', space: 'O(n)' },
        optimized: {
          description: 'Track counts of $5 and $10 bills; for $20 payments, prefer giving one $10+$5 over three $5s.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'five = ten = 0\n' +
            'for bill in bills:\n' +
            '    if bill == 5: five += 1\n' +
            '    elif bill == 10: if five == 0: return False; five -= 1; ten += 1\n' +
            '    else:\n' +
            '        if ten > 0 and five > 0: ten -= 1; five -= 1\n' +
            '        elif five >= 3: five -= 3\n' +
            '        else: return False',
        },
        explanation: 'A $5 bill can make change for anything while a $10 only helps with $20 payments, so keeping more $5s in reserve maximizes flexibility for future customers.',
      },
      {
        name: 'Candy',
        bruteForce: { description: 'Repeatedly scan the array adjusting candy counts wherever a rating constraint is violated, looping until stable.', time: 'O(n^2) worst case', space: 'O(n)' },
        optimized: {
          description: 'Two greedy passes — left to right increasing candy for a higher rating than the previous, then right to left similarly, taking the max at each position.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'candies = [1] * n\n' +
            'for i in 1..n-1: if ratings[i] > ratings[i-1]: candies[i] = candies[i-1] + 1\n' +
            'for i in n-2..0: if ratings[i] > ratings[i+1]: candies[i] = max(candies[i], candies[i+1] + 1)\n' +
            'return sum(candies)',
        },
        explanation: 'A left-to-right pass alone satisfies the left-neighbor constraint, and a right-to-left pass satisfies the mirrored right-neighbor constraint — taking the max of both satisfies both at once.',
      },
      {
        name: 'Minimum Number of Arrows to Burst Balloons',
        bruteForce: { description: 'Try every possible subset of arrow positions to find the minimal covering set.', time: 'exponential', space: 'O(n)' },
        optimized: {
          description: 'Sort balloons by end coordinate, shoot an arrow at the end of the first unburst balloon, bursting every overlapping balloon.',
          time: 'O(n log n)', space: 'O(1) extra',
          pseudocode:
            'balloons.sort(key=end)\n' +
            'arrows = 1; arrowPos = balloons[0].end\n' +
            'for start, end in balloons[1:]:\n' +
            '    if start > arrowPos: arrows += 1; arrowPos = end',
        },
        explanation: 'Shooting at the earliest-ending balloon\'s end point is always at least as good as anywhere else, since it hits that balloon plus any overlapping it there, without risking missing an even-sooner-ending balloon.',
      },
      {
        name: 'Queue Reconstruction by Height',
        bruteForce: { description: 'Try every ordering of people, checking which satisfies all "k taller in front" constraints.', time: 'O(n!)', space: 'O(n)' },
        optimized: {
          description: 'Sort by height descending (ties by k ascending), insert each person into the result at index k.',
          time: 'O(n^2)', space: 'O(n)',
          pseudocode:
            'people.sort(key=lambda p: (-p.height, p.k))\n' +
            'result = []\n' +
            'for p in people: result.insert(p.k, p)',
        },
        explanation: 'Placing taller people first means every already-placed person is at least as tall as the next to insert, so inserting at index k never disturbs the constraint for anyone already placed.',
      },
      {
        name: 'Minimum Platforms',
        bruteForce: { description: "For every train's arrival, scan all trains to count how many are still on the platform at that exact time.", time: 'O(n^2)', space: 'O(1) extra' },
        optimized: {
          description: 'Sort arrivals and departures separately, two pointers merging both sorted lists tracking the running max platform count.',
          time: 'O(n log n)', space: 'O(1) extra',
          pseudocode:
            'arrivals.sort(); departures.sort()\n' +
            'i = j = platforms = best = 0\n' +
            'while i < n:\n' +
            '    if arrivals[i] <= departures[j]: platforms += 1; best = max(best, platforms); i += 1\n' +
            '    else: platforms -= 1; j += 1',
        },
        explanation: 'Processing arrivals and departures in true chronological order tracks exactly how many trains are simultaneously present, and the peak of that count is the minimum platforms needed.',
      },
      {
        name: 'Boats to Save People',
        bruteForce: { description: 'Try every possible pairing of people into boats, checking which uses fewest boats within the weight limit.', time: 'exponential', space: 'O(n)' },
        optimized: {
          description: 'Sort by weight, two pointers from lightest and heaviest — pair them if they fit, otherwise send the heaviest alone.',
          time: 'O(n log n)', space: 'O(1) extra',
          pseudocode:
            'people.sort()\n' +
            'l, r, boats = 0, n-1, 0\n' +
            'while l <= r:\n' +
            '    if people[l] + people[r] <= limit: l += 1\n' +
            '    r -= 1; boats += 1',
        },
        explanation: 'Pairing heaviest with lightest whenever possible uses spare boat capacity most efficiently, and if even the lightest can\'t fit with the heaviest, no one else could fit with them either.',
      },
      {
        name: 'Two City Scheduling',
        bruteForce: { description: 'Try every way to split 2n people into two groups of n, computing total cost for each split.', time: 'O(C(2n,n))', space: 'O(n)' },
        optimized: {
          description: 'Sort by (costA − costB), send the first n to city A, the rest to city B.',
          time: 'O(n log n)', space: 'O(1) extra',
          pseudocode:
            'costs.sort(key=lambda p: p.costA - p.costB)\n' +
            'total = 0\n' +
            'for i, p in enumerate(costs):\n' +
            '    total += p.costA if i < n else p.costB',
        },
        explanation: 'Prioritizing city A for the people who benefit most from it, and letting everyone else go to B, minimizes the total combined cost.',
      },
    ],
  },
  {
    name: 'Sorting & Searching',
    problems: [
      {
        name: 'Binary Search',
        bruteForce: { description: 'Linear scan checking every element.', time: 'O(n)', space: 'O(1)' },
        optimized: {
          description: 'Repeatedly halve the search range by comparing the middle element to the target.',
          time: 'O(log n)', space: 'O(1)',
          pseudocode:
            'lo, hi = 0, n - 1\n' +
            'while lo <= hi:\n' +
            '    mid = (lo + hi) // 2\n' +
            '    if nums[mid] == target: return mid\n' +
            '    elif nums[mid] < target: lo = mid + 1\n' +
            '    else: hi = mid - 1\n' +
            'return -1',
        },
        explanation: 'Because the array is sorted, comparing the middle element to the target tells you which half the answer must be in, so half the remaining search space is discarded at every step.',
      },
      {
        name: 'Search in Rotated Sorted Array',
        bruteForce: { description: 'Linear scan checking every element.', time: 'O(n)', space: 'O(1)' },
        optimized: {
          description: 'Modified binary search — determine which half around the midpoint is properly sorted, then check if the target lies in that half\'s range.',
          time: 'O(log n)', space: 'O(1)',
          pseudocode:
            'while lo <= hi:\n' +
            '    mid = (lo+hi)//2\n' +
            '    if nums[mid] == target: return mid\n' +
            '    if nums[lo] <= nums[mid]:  # left half sorted\n' +
            '        if nums[lo] <= target < nums[mid]: hi = mid-1\n' +
            '        else: lo = mid+1\n' +
            '    else:  # right half sorted\n' +
            '        if nums[mid] < target <= nums[hi]: lo = mid+1\n' +
            '        else: hi = mid-1',
        },
        explanation: 'At least one half around any midpoint is always properly sorted, and knowing which one lets you use its known range to decide whether the target could be there.',
      },
      {
        name: 'Find Minimum in Rotated Sorted Array',
        bruteForce: { description: 'Linear scan to find where the order breaks.', time: 'O(n)', space: 'O(1)' },
        optimized: {
          description: 'Binary search comparing mid to the rightmost element — if mid > right, the minimum is in the right half.',
          time: 'O(log n)', space: 'O(1)',
          pseudocode:
            'lo, hi = 0, n - 1\n' +
            'while lo < hi:\n' +
            '    mid = (lo + hi) // 2\n' +
            '    if nums[mid] > nums[hi]: lo = mid + 1\n' +
            '    else: hi = mid\n' +
            'return nums[lo]',
        },
        explanation: "Comparing the middle to the range's end tells you whether the rotation point (where the minimum sits) is left or right of mid, letting you search toward it directly.",
      },
      {
        name: 'Kth Largest Element (Quickselect)',
        bruteForce: { description: 'Sort the array fully, index from the end.', time: 'O(n log n)', space: 'O(1) extra' },
        optimized: {
          description: 'Quickselect — partition like quicksort, but only recurse into the side containing the kth position.',
          time: 'O(n) average', space: 'O(1) extra',
          pseudocode:
            'def quickselect(lo, hi, targetIdx):\n' +
            '    pivotIdx = partition(lo, hi)\n' +
            '    if pivotIdx == targetIdx: return nums[pivotIdx]\n' +
            '    elif pivotIdx < targetIdx: return quickselect(pivotIdx+1, hi, targetIdx)\n' +
            '    else: return quickselect(lo, pivotIdx-1, targetIdx)',
        },
        explanation: "After partitioning around a pivot, you know immediately whether the kth largest is in the left, right, or is the pivot — so you only ever recurse into one side, not both.",
      },
      {
        name: 'Median of Two Sorted Arrays',
        bruteForce: { description: 'Merge both arrays into one sorted array, pick the middle element(s).', time: 'O(m+n)', space: 'O(m+n)' },
        optimized: {
          description: 'Binary search on the smaller array for a partition point where everything left of the combined cut is ≤ everything right.',
          time: 'O(log(min(m,n)))', space: 'O(1)',
          pseudocode:
            'ensure A is the shorter array\n' +
            'lo, hi = 0, len(A)\n' +
            'while lo <= hi:\n' +
            '    i = (lo+hi)//2; j = (m+n+1)//2 - i\n' +
            '    if A[i-1] <= B[j] and B[j-1] <= A[i]: return combine(A, B, i, j)\n' +
            '    elif A[i-1] > B[j]: hi = i - 1\n' +
            '    else: lo = i + 1',
        },
        explanation: 'Binary searching for a cut point in the smaller array (which also fixes the cut in the larger array via arithmetic) such that all left-side elements are smaller than all right-side elements directly locates the median.',
      },
      {
        name: 'Merge Sort',
        bruteForce: { description: 'Insertion sort — repeatedly insert each element into its correct position among the sorted prefix.', time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Recursively split the array in half, sort each half, merge the two sorted halves.',
          time: 'O(n log n)', space: 'O(n)',
          pseudocode:
            'def mergeSort(arr):\n' +
            '    if len(arr) <= 1: return arr\n' +
            '    mid = len(arr) // 2\n' +
            '    left = mergeSort(arr[:mid]); right = mergeSort(arr[mid:])\n' +
            '    return merge(left, right)',
        },
        explanation: 'Merging two already-sorted halves takes one linear pass comparing their fronts, so recursively sorting halves and merging back up does far less total comparison work than shifting elements one at a time.',
      },
      {
        name: 'Quick Sort',
        bruteForce: { description: 'Insertion sort as a baseline.', time: 'O(n^2)', space: 'O(1)' },
        optimized: {
          description: 'Pick a pivot, partition into less-than and greater-than, recursively sort each side.',
          time: 'O(n log n) average', space: 'O(log n)',
          pseudocode:
            'def quicksort(arr, lo, hi):\n' +
            '    if lo >= hi: return\n' +
            '    p = partition(arr, lo, hi)\n' +
            '    quicksort(arr, lo, p-1); quicksort(arr, p+1, hi)',
        },
        explanation: "After partitioning, the pivot is already in its final position, with everything smaller entirely to its left and larger entirely to its right — the two sides can be sorted completely independently from then on.",
      },
      {
        name: 'Find First and Last Position of Element',
        bruteForce: { description: 'Linear scan tracking the first and last index where the target appears.', time: 'O(n)', space: 'O(1)' },
        optimized: {
          description: 'Two binary searches, one biased to find the leftmost occurrence, one biased to find the rightmost.',
          time: 'O(log n)', space: 'O(1)',
          pseudocode:
            'def findBound(leftmost):\n' +
            '    lo, hi, result = 0, n-1, -1\n' +
            '    while lo <= hi:\n' +
            '        mid = (lo+hi)//2\n' +
            '        if nums[mid] == target: result = mid; (hi = mid-1 if leftmost else lo = mid+1)\n' +
            '        elif nums[mid] < target: lo = mid+1\n' +
            '        else: hi = mid-1\n' +
            '    return result',
        },
        explanation: 'Continuing to search left (or right) even after finding a match, rather than stopping immediately, pushes the found index all the way to the boundary of the matching range.',
      },
      {
        name: 'Search a 2D Matrix',
        bruteForce: { description: 'Scan every cell individually.', time: 'O(rows*cols)', space: 'O(1)' },
        optimized: {
          description: 'Treat the matrix as one flattened sorted sequence, binary search using index arithmetic to map back to (row, col).',
          time: 'O(log(rows*cols))', space: 'O(1)',
          pseudocode:
            'lo, hi = 0, rows*cols - 1\n' +
            'while lo <= hi:\n' +
            '    mid = (lo+hi)//2; r, c = divmod(mid, cols)\n' +
            '    if matrix[r][c] == target: return True\n' +
            '    elif matrix[r][c] < target: lo = mid+1\n' +
            '    else: hi = mid-1\n' +
            'return False',
        },
        explanation: 'With sorted rows stacked in increasing order, the whole matrix behaves like one long sorted array, so a flat binary search using division and modulo works exactly like a normal one.',
      },
      {
        name: 'Kth Smallest Pair Distance',
        bruteForce: { description: 'Compute every pair\'s distance, sort them, return the kth.', time: 'O(n^2 log n)', space: 'O(n^2)' },
        optimized: {
          description: 'Binary search on the answer (the distance value) — for a candidate distance, count pairs within it using a sliding window on the sorted array.',
          time: 'O(n log n + n log(max−min))', space: 'O(1) extra',
          pseudocode:
            'nums.sort()\n' +
            'def countPairsWithin(dist):\n' +
            '    left = count = 0\n' +
            '    for right in range(n):\n' +
            '        while nums[right] - nums[left] > dist: left += 1\n' +
            '        count += right - left\n' +
            '    return count\n' +
            'binary search smallest dist where countPairsWithin(dist) >= k',
        },
        explanation: 'Binary searching directly on "what distance could be the answer," using a fast sliding-window count of how many pairs are within that distance, avoids generating and sorting every pair distance.',
      },
      {
        name: 'Sqrt(x)',
        bruteForce: { description: 'Try every integer starting from 0, squaring it until it exceeds x.', time: 'O(sqrt(x))', space: 'O(1)' },
        optimized: {
          description: 'Binary search over [0, x] for the largest integer whose square doesn\'t exceed x.',
          time: 'O(log x)', space: 'O(1)',
          pseudocode:
            'lo, hi, ans = 0, x, 0\n' +
            'while lo <= hi:\n' +
            '    mid = (lo+hi)//2\n' +
            '    if mid*mid <= x: ans = mid; lo = mid+1\n' +
            '    else: hi = mid-1\n' +
            'return ans',
        },
        explanation: '"Does n^2 exceed x" is monotonic in n, exactly the condition binary search needs, so the boundary between too-small and too-big squares is found in logarithmic steps.',
      },
      {
        name: 'Search Insert Position',
        bruteForce: { description: 'Linear scan until finding the first element ≥ target.', time: 'O(n)', space: 'O(1)' },
        optimized: {
          description: 'Binary search for the leftmost position where the target could be inserted while keeping the array sorted.',
          time: 'O(log n)', space: 'O(1)',
          pseudocode:
            'lo, hi = 0, n\n' +
            'while lo < hi:\n' +
            '    mid = (lo+hi)//2\n' +
            '    if nums[mid] < target: lo = mid+1\n' +
            '    else: hi = mid\n' +
            'return lo',
        },
        explanation: 'Standard binary search narrows the range based on comparisons until it collapses to the single boundary position where the target belongs.',
      },
      {
        name: 'Find Peak Element',
        bruteForce: { description: 'Linear scan checking each element against both neighbors.', time: 'O(n)', space: 'O(1)' },
        optimized: {
          description: 'Binary search — compare mid to its right neighbor; if smaller, a peak exists to the right, otherwise at or left of mid.',
          time: 'O(log n)', space: 'O(1)',
          pseudocode:
            'lo, hi = 0, n - 1\n' +
            'while lo < hi:\n' +
            '    mid = (lo+hi)//2\n' +
            '    if nums[mid] < nums[mid+1]: lo = mid+1\n' +
            '    else: hi = mid\n' +
            'return lo',
        },
        explanation: 'If the middle element is smaller than its right neighbor, values are increasing in that direction, and an increasing sequence bounded by array edges must eventually peak — so half the range can always be safely discarded.',
      },
      {
        name: 'Search in Rotated Sorted Array II (duplicates)',
        bruteForce: { description: 'Linear scan.', time: 'O(n)', space: 'O(1)' },
        optimized: {
          description: 'Modified binary search; when endpoints and mid are all equal (ambiguous which half is sorted), shrink the range by one from both ends.',
          time: 'O(log n) average, O(n) worst', space: 'O(1)',
          pseudocode:
            'while lo <= hi:\n' +
            '    mid = (lo+hi)//2\n' +
            '    if nums[mid] == target: return True\n' +
            '    if nums[lo]==nums[mid]==nums[hi]: lo += 1; hi -= 1; continue\n' +
            '    ...same branching as Search in Rotated Sorted Array...',
        },
        explanation: 'Duplicates can make it impossible to tell which half is sorted, so in that ambiguous case, safely shrinking the range by one element from each side still makes progress without skipping the target.',
      },
      {
        name: 'Median of a Row-Wise Sorted Matrix',
        bruteForce: { description: 'Flatten and sort the entire matrix, pick the middle element.', time: 'O(rows*cols log(rows*cols))', space: 'O(rows*cols)' },
        optimized: {
          description: 'Binary search over the possible value range; count elements ≤ a candidate value using a binary search within each sorted row.',
          time: 'O(rows * log(cols) * log(max−min))', space: 'O(1) extra',
          pseudocode:
            'lo, hi = min(matrix), max(matrix)\n' +
            'while lo < hi:\n' +
            '    mid = (lo+hi)//2\n' +
            '    count = sum(binary_search_count_leq(row, mid) for row in matrix)\n' +
            '    if count < (rows*cols)//2 + 1: lo = mid+1\n' +
            '    else: hi = mid\n' +
            'return lo',
        },
        explanation: 'Since each row is independently sorted, counting elements ≤ a candidate is fast per row, so binary searching directly on the value — toward the one whose count matches the median\'s rank — avoids fully sorting the matrix.',
      },
    ],
  },
  {
    name: 'Bit Manipulation',
    problems: [
      {
        name: 'Single Number',
        bruteForce: { description: 'Hash map counting occurrences, return the one with count 1.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'XOR every number together — pairs cancel to 0, leaving only the single number.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'result = 0\n' +
            'for x in nums: result ^= x\n' +
            'return result',
        },
        explanation: 'A number XOR itself gives 0, and XOR with 0 leaves a number unchanged, so XOR-ing everything cancels out every number appearing twice, leaving exactly the one that appears alone.',
      },
      {
        name: 'Number of 1 Bits',
        bruteForce: { description: 'Check each of the 32 bits individually via shifting and masking.', time: 'O(32)', space: 'O(1)' },
        optimized: {
          description: "Brian Kernighan's trick — repeatedly do n = n & (n−1), clearing the lowest set bit each time; count iterations.",
          time: 'O(set bits)', space: 'O(1)',
          pseudocode:
            'count = 0\n' +
            'while n != 0:\n' +
            '    n &= n - 1\n' +
            '    count += 1\n' +
            'return count',
        },
        explanation: 'n & (n−1) always clears exactly the lowest set bit, so counting how many times you can do that before reaching zero counts the set bits directly, skipping the zero bits entirely.',
      },
      {
        name: 'Counting Bits',
        bruteForce: { description: 'For every number from 0 to n, count its bits individually.', time: 'O(n log n)', space: 'O(n)' },
        optimized: {
          description: 'DP where bits(i) = bits(i >> 1) + (i & 1) — reuse the already-computed answer for i without its last bit.',
          time: 'O(n)', space: 'O(n)',
          pseudocode:
            'dp = [0] * (n + 1)\n' +
            'for i in range(1, n + 1):\n' +
            '    dp[i] = dp[i >> 1] + (i & 1)\n' +
            'return dp',
        },
        explanation: 'Shifting a number right by one bit is the same as dropping the last bit, so its bit count is the count for that smaller number plus 1 if the dropped bit was a 1.',
      },
      {
        name: 'Missing Number',
        bruteForce: { description: 'Sort the array, scan for the first index where the value doesn\'t match the index.', time: 'O(n log n)', space: 'O(1) extra' },
        optimized: {
          description: 'XOR all numbers 0..n with all array values — everything present cancels, leaving the missing number.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'result = n\n' +
            'for i, x in enumerate(nums):\n' +
            '    result ^= i ^ x\n' +
            'return result',
        },
        explanation: 'XOR-ing every expected number with every actual value cancels out every number actually present, since each appears twice across both sets — whatever remains is the missing one.',
      },
      {
        name: 'Reverse Bits',
        bruteForce: { description: 'Convert to a binary string, reverse it, convert back.', time: 'O(32)', space: 'O(32)' },
        optimized: {
          description: 'Build the result by shifting it left and OR-ing in the lowest bit of the input, then shift the input right.',
          time: 'O(32)', space: 'O(1)',
          pseudocode:
            'result = 0\n' +
            'for _ in range(32):\n' +
            '    result = (result << 1) | (n & 1)\n' +
            '    n >>= 1\n' +
            'return result',
        },
        explanation: 'Peeling the lowest input bit and appending it to the top of the result, one bit at a time, naturally builds the reversed order without a string representation.',
      },
      {
        name: 'Single Number II',
        bruteForce: { description: 'Hash map counting occurrences, return the one with count 1.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'Track bit counts modulo 3 for each bit position across all numbers.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'ones = twos = 0\n' +
            'for x in nums:\n' +
            '    ones = (ones ^ x) & ~twos\n' +
            '    twos = (twos ^ x) & ~ones\n' +
            'return ones',
        },
        explanation: "If every number but one appears three times, summing any single bit position across all numbers must be a multiple of 3 plus the answer's bit — tracking counts modulo 3 isolates exactly the answer's bits.",
      },
      {
        name: 'Single Number III',
        bruteForce: { description: 'Hash map counting occurrences, return the two with count 1.', time: 'O(n)', space: 'O(n)' },
        optimized: {
          description: 'XOR everything to get the XOR of the two unique numbers, find a set bit where they differ, split numbers by that bit and XOR each group.',
          time: 'O(n)', space: 'O(1)',
          pseudocode:
            'xorAll = xor of all nums\n' +
            'diffBit = xorAll & (-xorAll)  # lowest set bit\n' +
            'a = b = 0\n' +
            'for x in nums:\n' +
            '    if x & diffBit: a ^= x\n' +
            '    else: b ^= x\n' +
            'return [a, b]',
        },
        explanation: 'XOR-ing everything cancels duplicates and leaves the XOR of the two uniques; any set bit in that result differs between them, so splitting by that bit separates and isolates each unique number.',
      },
      {
        name: 'Sum of Two Integers (no + or −)',
        bruteForce: { description: 'Repeatedly increment/decrement one number while decrementing/incrementing the other until one reaches zero.', time: 'O(min(a,b))', space: 'O(1)' },
        optimized: {
          description: 'XOR gives the sum without carrying, AND (shifted left by 1) gives the carry; repeat until no carry remains.',
          time: 'O(32)', space: 'O(1)',
          pseudocode:
            'while b != 0:\n' +
            '    carry = (a & b) << 1\n' +
            '    a = a ^ b\n' +
            '    b = carry\n' +
            'return a',
        },
        explanation: 'XOR alone adds two bits but loses the carry, while AND-shifted captures exactly where a carry was generated — repeating both mimics binary addition\'s carry propagation until none remain.',
      },
      {
        name: 'Power of Two',
        bruteForce: { description: 'Repeatedly divide by 2, checking for a remainder, until reaching 1.', time: 'O(log n)', space: 'O(1)' },
        optimized: {
          description: 'Check n & (n−1) == 0 (and n > 0) — a power of two has exactly one bit set.',
          time: 'O(1)', space: 'O(1)',
          pseudocode: 'return n > 0 and (n & (n - 1)) == 0',
        },
        explanation: 'n & (n−1) clears the lowest set bit, so if n only had one bit set to begin with, the result is zero — replacing the whole repeated-division loop with one check.',
      },
      {
        name: 'Bitwise AND of Numbers Range',
        bruteForce: { description: 'AND every number in the range from left to right individually.', time: 'O(right − left)', space: 'O(1)' },
        optimized: {
          description: 'Right-shift both range endpoints together until equal — that common prefix, shifted back left, is the answer.',
          time: 'O(log(right))', space: 'O(1)',
          pseudocode:
            'shift = 0\n' +
            'while left != right:\n' +
            '    left >>= 1; right >>= 1; shift += 1\n' +
            'return left << shift',
        },
        explanation: 'ANDing a range only preserves bits that stay the same across every number in it, and any bit that changes anywhere in the range gets zeroed by some number, so the answer is just the shared binary prefix of both endpoints.',
      },
      {
        name: 'Maximum XOR of Two Numbers in an Array',
        bruteForce: { description: "Check every pair's XOR.", time: 'O(n^2)', space: 'O(1) extra' },
        optimized: {
          description: "Build a bitwise trie of all numbers, then for each number greedily walk the trie trying to take the opposite bit at every level.",
          time: 'O(n * bitwidth)', space: 'O(n * bitwidth)',
          pseudocode:
            'insert every number\'s bits (MSB first) into a binary trie\n' +
            'for each number x:\n' +
            '    walk the trie choosing, at each bit, the opposite of x\'s bit if that child exists\n' +
            '    accumulate the resulting max XOR',
        },
        explanation: "To maximize XOR with a number, you want the opposite bit at every position if possible, and a trie lets you check 'does a number with the opposite bit exist here' in constant time per level.",
      },
      {
        name: 'Total Hamming Distance',
        bruteForce: { description: 'Compute the Hamming distance between every pair of numbers and sum them.', time: 'O(n^2 * bitwidth)', space: 'O(1) extra' },
        optimized: {
          description: "For each bit position, count how many numbers have it set (c); that bit's contribution is c * (n − c).",
          time: 'O(n * bitwidth)', space: 'O(1)',
          pseudocode:
            'total = 0\n' +
            'for bit in range(32):\n' +
            '    c = count of nums with that bit set\n' +
            '    total += c * (len(nums) - c)\n' +
            'return total',
        },
        explanation: 'The total distance breaks down cleanly bit by bit — only pairs where one number has a bit set and the other doesn\'t contribute at that position, and that count is directly (set) times (unset).',
      },
      {
        name: 'Gray Code',
        bruteForce: { description: 'Generate all 2^n binary numbers and search/backtrack for an ordering where consecutive values differ by one bit.', time: 'exponential', space: 'O(2^n)' },
        optimized: {
          description: 'Direct formula — the nth Gray code value is n XOR (n >> 1).',
          time: 'O(2^bits)', space: 'O(2^bits)',
          pseudocode: 'return [i ^ (i >> 1) for i in range(2**n)]',
        },
        explanation: 'XOR-ing a number with itself shifted right by one produces a sequence where consecutive values always differ in exactly one bit — a mathematical identity that sidesteps any search.',
      },
      {
        name: 'Divide Two Integers',
        bruteForce: { description: 'Repeatedly subtract the divisor from the dividend, counting subtractions.', time: 'O(dividend / divisor)', space: 'O(1)' },
        optimized: {
          description: 'Repeatedly find the largest power-of-two multiple of the divisor that still fits (via bit shifting), subtract it, and add the corresponding power of two to the quotient.',
          time: 'O(log^2(dividend))', space: 'O(1)',
          pseudocode:
            'quotient = 0\n' +
            'while dividend >= divisor:\n' +
            '    temp, multiple = divisor, 1\n' +
            '    while dividend >= (temp << 1): temp <<= 1; multiple <<= 1\n' +
            '    dividend -= temp; quotient += multiple\n' +
            'return quotient',
        },
        explanation: 'Subtracting the largest doubling of the divisor that still fits (found by shifting until it would overshoot) knocks out large chunks of the dividend per step, instead of one divisor at a time.',
      },
      {
        name: 'Subsets using Bitmasking',
        bruteForce: { description: 'Recursive backtracking (include/exclude) building subsets one element at a time.', time: 'O(n * 2^n)', space: 'O(n * 2^n)' },
        optimized: {
          description: "Iterate every integer from 0 to 2^n − 1, using its binary representation as a mask to decide which elements to include.",
          time: 'O(n * 2^n)', space: 'O(n * 2^n)',
          pseudocode:
            'for mask in range(2**n):\n' +
            '    subset = [nums[i] for i in range(n) if mask & (1 << i)]\n' +
            '    result.append(subset)',
        },
        explanation: 'Every subset corresponds to exactly one n-bit number (a set bit at position i means include element i), so counting from 0 to 2^n − 1 directly enumerates every subset without recursion.',
      },
    ],
  },
];

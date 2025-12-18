/**
 * cart.js
 * --------
 * Pure cart management engine for SWSE Store 2.0.
 *
 * Cart structure:
 * {
 *   entries: [
 *     {
 *       id,
 *       name,
 *       img,
 *       type,          // item | droid | vehicle
 *       quantity,      // default 1
 *       cost,          // cost per unit (finalCost)
 *       condition,     // "new" or "used" (vehicles)
 *       ref            // reference to normalized store item
 *     }
 *   ]
 * }
 */

export class StoreCart {

  constructor(initialEntries = []) {
    this.entries = initialEntries;
  }

  /* -------------------------------------------------- */
  /* ADD ITEM                                            */
  /* -------------------------------------------------- */

  /**
   * Add a store item to cart (or increment if exists).
   *
   * @param {StoreItem} ref - normalized store item
   * @param {Object} opts
   * @param {String} opts.type - item type (default: ref.type)
   * @param {String} opts.condition - "new" or "used" (vehicles)
   *
   * @returns {Object} the entry
   */
  add(ref, opts = {}) {
    const type = opts.type || ref.type;
    const condition = opts.condition || "new";

    // Determine cost based on condition
    const cost =
      type === "vehicle" && condition === "used" && ref.finalCostUsed
        ? ref.finalCostUsed
        : ref.finalCost;

    // Check if already in cart (consolidate by ID + condition)
    const existing = this.entries.find(
      e => e.id === ref.id && e.condition === condition
    );

    if (existing) {
      existing.quantity++;
      return existing;
    }

    // Create new entry
    const entry = {
      id: ref.id,
      name: ref.name,
      img: ref.img,
      type,
      condition,
      quantity: 1,
      cost,
      ref
    };

    this.entries.push(entry);
    return entry;
  }

  /* -------------------------------------------------- */
  /* REMOVE ENTRY                                        */
  /* -------------------------------------------------- */

  /**
   * Remove entire entry from cart (by ID + condition).
   */
  remove(id, condition = "new") {
    this.entries = this.entries.filter(
      e => !(e.id === id && e.condition === condition)
    );
  }

  /* -------------------------------------------------- */
  /* QUANTITY MANAGEMENT                                 */
  /* -------------------------------------------------- */

  /**
   * Set quantity for an entry.
   */
  setQuantity(id, qty, condition = "new") {
    const entry = this.entries.find(
      e => e.id === id && e.condition === condition
    );
    if (!entry) return;

    const newQty = Math.max(1, Number(qty) || 1);
    entry.quantity = newQty;
  }

  /**
   * Increment quantity for an entry.
   */
  increment(id, condition = "new") {
    const entry = this.entries.find(
      e => e.id === id && e.condition === condition
    );
    if (entry) entry.quantity++;
  }

  /**
   * Decrement quantity for an entry.
   * Removes entry if quantity drops to 0.
   */
  decrement(id, condition = "new") {
    const entry = this.entries.find(
      e => e.id === id && e.condition === condition
    );
    if (!entry) return;

    entry.quantity--;
    if (entry.quantity <= 0) {
      this.remove(id, condition);
    }
  }

  /* -------------------------------------------------- */
  /* CART TOTALS                                         */
  /* -------------------------------------------------- */

  /**
   * Calculate cart subtotal.
   * @returns {number} Total cost
   */
  get subtotal() {
    return this.entries.reduce((sum, entry) => {
      const lineTotal = (entry.cost ?? 0) * (entry.quantity ?? 1);
      return sum + lineTotal;
    }, 0);
  }

  /**
   * Get item count (by quantity).
   * @returns {number} Total items
   */
  get itemCount() {
    return this.entries.reduce((sum, e) => sum + (e.quantity ?? 1), 0);
  }

  /**
   * Get unique item count (number of entries).
   * @returns {number} Number of distinct items
   */
  get uniqueItemCount() {
    return this.entries.length;
  }

  /* -------------------------------------------------- */
  /* CART STATE                                          */
  /* -------------------------------------------------- */

  /**
   * Check if cart is empty.
   */
  get isEmpty() {
    return this.entries.length === 0;
  }

  /**
   * Clear entire cart.
   */
  clear() {
    this.entries = [];
  }

  /* -------------------------------------------------- */
  /* GETTERS                                             */
  /* -------------------------------------------------- */

  /**
   * Get entry by ID and condition.
   */
  getEntry(id, condition = "new") {
    return this.entries.find(
      e => e.id === id && e.condition === condition
    );
  }

  /**
   * Get all entries of a specific type.
   */
  getByType(type) {
    return this.entries.filter(e => e.type === type);
  }

  /* -------------------------------------------------- */
  /* SERIALIZATION                                       */
  /* -------------------------------------------------- */

  /**
   * Export cart for storage/transmission.
   */
  toJSON() {
    return {
      entries: this.entries.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        condition: e.condition,
        quantity: e.quantity,
        cost: e.cost
      }))
    };
  }

  /**
   * Import cart from stored state.
   */
  static fromJSON(data) {
    const cart = new StoreCart();
    if (data?.entries) {
      cart.entries = data.entries;
    }
    return cart;
  }
}

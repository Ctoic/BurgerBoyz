import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ApiAdminMenuResponse, ApiDeal, ApiMenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Search, Plus } from "lucide-react";
import heroBurger from "@/assets/hero-burger.jpg";
import PaginationFooter from "@/components/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";

const SECTION_LABELS: Record<string, string> = {
  products: "Products",
  categories: "Categories",
  deals: "Deals",
  addons: "Addons",
};

const AdminMenu = () => {
  const { section } = useParams();
  const activeSection = section ?? "products";
  const sectionTitle = SECTION_LABELS[activeSection] ?? "Products";

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-menu"],
    queryFn: () => apiFetch<ApiAdminMenuResponse>("/admin/menu"),
  });

  const categories = data?.categories ?? [];
  const addOns = data?.addOns ?? [];
  const deals = data?.deals ?? [];

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    position: 0,
    isActive: true,
  });

  const [addOnForm, setAddOnForm] = useState({
    categoryId: "",
    name: "",
    price: "",
    isActive: true,
  });

  const [itemForm, setItemForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    price: "",
    imageUrl: "",
  });
  const [dealForm, setDealForm] = useState({
    name: "",
    description: "",
    tag: "Deal",
    imageUrl: "",
    discount: "",
    bundleItemQuantities: {} as Record<string, number>,
    isActive: true,
  });

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", position: 0, isActive: true });
    setEditingCategoryId(null);
  };

  const resetAddOnForm = () => {
    setAddOnForm({
      categoryId: categories[0]?.id ?? "",
      name: "",
      price: "",
      isActive: true,
    });
    setEditingAddOnId(null);
  };

  const resetItemForm = () => {
    setItemForm({
      categoryId: categories[0]?.id ?? "",
      name: "",
      description: "",
      price: "",
      imageUrl: "",
    });
    setEditingItemId(null);
  };

  const resetDealForm = () => {
    setDealForm({
      name: "",
      description: "",
      tag: "Deal",
      imageUrl: "",
      discount: "",
      bundleItemQuantities: {},
      isActive: true,
    });
    setEditingDealId(null);
  };

  useEffect(() => {
    if (!itemForm.categoryId && categories.length > 0) {
      setItemForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, itemForm.categoryId]);

  useEffect(() => {
    if (!addOnForm.categoryId && categories.length > 0) {
      setAddOnForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, addOnForm.categoryId]);

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      apiFetch("/admin/menu/categories", {
        method: "POST",
        body: JSON.stringify({
          name: categoryForm.name,
          position: Number(categoryForm.position) || 0,
          isActive: categoryForm.isActive,
        }),
      }),
    onSuccess: () => {
      resetCategoryForm();
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/menu/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: categoryForm.name,
          position: Number(categoryForm.position) || 0,
          isActive: categoryForm.isActive,
        }),
      }),
    onSuccess: () => {
      resetCategoryForm();
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/admin/menu/categories/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const createAddOnMutation = useMutation({
    mutationFn: () =>
      apiFetch("/admin/menu/add-ons", {
        method: "POST",
        body: JSON.stringify({
          categoryId: addOnForm.categoryId || undefined,
          name: addOnForm.name,
          priceCents: Math.round(Number(addOnForm.price) * 100),
          isActive: addOnForm.isActive,
        }),
      }),
    onSuccess: () => {
      resetAddOnForm();
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const updateAddOnMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/menu/add-ons/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          categoryId: addOnForm.categoryId,
          name: addOnForm.name,
          priceCents: Math.round(Number(addOnForm.price) * 100),
          isActive: addOnForm.isActive,
        }),
      }),
    onSuccess: () => {
      resetAddOnForm();
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const deleteAddOnMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/admin/menu/add-ons/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: () =>
      apiFetch("/admin/menu/items", {
        method: "POST",
        body: JSON.stringify({
          categoryId: itemForm.categoryId,
          name: itemForm.name,
          description: itemForm.description,
          priceCents: Math.round(Number(itemForm.price) * 100),
          imageUrl: itemForm.imageUrl || undefined,
        }),
      }),
    onSuccess: () => {
      resetItemForm();
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
      setIsProductDialogOpen(false);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/menu/items/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          categoryId: itemForm.categoryId,
          name: itemForm.name,
          description: itemForm.description,
          priceCents: Math.round(Number(itemForm.price) * 100),
          imageUrl: itemForm.imageUrl || undefined,
        }),
      }),
    onSuccess: () => {
      resetItemForm();
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
      setIsProductDialogOpen(false);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/menu/items/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const createDealMutation = useMutation({
    mutationFn: () =>
      apiFetch<ApiDeal>("/admin/menu/deals", {
        method: "POST",
        body: JSON.stringify({
          name: dealForm.name,
          description: dealForm.description,
          tag: dealForm.tag || undefined,
          imageUrl: dealForm.imageUrl || undefined,
          bundleItems: dealItemOptions
            .map((item) => ({
              menuItemId: item.id,
              quantity: dealForm.bundleItemQuantities[item.id] ?? 0,
            }))
            .filter((item) => item.quantity > 0),
          discountCents: dealForm.discount
            ? Math.round(Number(dealForm.discount) * 100)
            : 0,
          isActive: dealForm.isActive,
        }),
      }),
    onSuccess: () => {
      resetDealForm();
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ApiDeal>(`/admin/menu/deals/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: dealForm.name,
          description: dealForm.description,
          tag: dealForm.tag || undefined,
          imageUrl: dealForm.imageUrl || undefined,
          bundleItems: dealItemOptions
            .map((item) => ({
              menuItemId: item.id,
              quantity: dealForm.bundleItemQuantities[item.id] ?? 0,
            }))
            .filter((item) => item.quantity > 0),
          discountCents: dealForm.discount
            ? Math.round(Number(dealForm.discount) * 100)
            : 0,
          isActive: dealForm.isActive,
        }),
      }),
    onSuccess: () => {
      resetDealForm();
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/admin/menu/deals/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
    },
  });

  const categoryItems = useMemo(() => {
    return categories.flatMap((category) =>
      category.items.map((item) => ({ category, item })),
    );
  }, [categories]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return categoryItems.filter(({ category, item }) => {
      const matchesCategory =
        productCategoryFilter === "all" || category.id === productCategoryFilter;
      if (!matchesCategory) {
        return false;
      }
      if (!searchTerm.trim()) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        category.name.toLowerCase().includes(term)
      );
    });
  }, [categoryItems, productCategoryFilter, searchTerm]);
  const productsPagination = usePagination(filteredItems, {
    pageSize: 10,
    resetDeps: [searchTerm, productCategoryFilter, activeSection],
  });
  const paginatedProducts = productsPagination.paginatedItems;

  const dealItemOptions = useMemo(() => {
    return categories.flatMap((category) =>
      category.items.map((item) => ({
        id: item.id,
        name: item.name,
        categoryName: category.name,
        priceCents: item.priceCents,
      })),
    );
  }, [categories]);
  const categoriesPagination = usePagination(categories, {
    pageSize: 10,
    resetDeps: [activeSection],
  });
  const paginatedCategories = categoriesPagination.paginatedItems;
  const addOnsPagination = usePagination(addOns, {
    pageSize: 10,
    resetDeps: [activeSection],
  });
  const paginatedAddOns = addOnsPagination.paginatedItems;
  const dealsPagination = usePagination(deals, {
    pageSize: 10,
    resetDeps: [activeSection],
  });
  const paginatedDeals = dealsPagination.paginatedItems;

  const handleDealItemQuantityChange = (itemId: string, rawQuantity: string) => {
    const parsedQuantity = Math.max(0, Math.floor(Number(rawQuantity) || 0));
    setDealForm((prev) => {
      if (parsedQuantity === 0) {
        const { [itemId]: _unused, ...remainingQuantities } = prev.bundleItemQuantities;
        return {
          ...prev,
          bundleItemQuantities: remainingQuantities,
        };
      }
      return {
        ...prev,
        bundleItemQuantities: {
          ...prev.bundleItemQuantities,
          [itemId]: parsedQuantity,
        },
      };
    });
  };

  const handleOpenCreateProductDialog = () => {
    resetItemForm();
    setIsProductDialogOpen(true);
  };

  const handleOpenEditProductDialog = (item: ApiMenuItem, categoryId: string) => {
    setEditingItemId(item.id);
    setItemForm({
      categoryId,
      name: item.name,
      description: item.description,
      price: (item.priceCents / 100).toFixed(2),
      imageUrl: item.imageUrl ?? "",
    });
    setIsProductDialogOpen(true);
  };

  const handleProductDialogOpenChange = (open: boolean) => {
    setIsProductDialogOpen(open);
    if (!open) {
      resetItemForm();
    }
  };

  const handleCategorySubmit = () => {
    if (editingCategoryId) {
      updateCategoryMutation.mutate(editingCategoryId);
      return;
    }
    createCategoryMutation.mutate();
  };

  const handleAddOnSubmit = () => {
    if (editingAddOnId) {
      updateAddOnMutation.mutate(editingAddOnId);
      return;
    }
    createAddOnMutation.mutate();
  };

  const handleDealSubmit = () => {
    if (editingDealId) {
      updateDealMutation.mutate(editingDealId);
      return;
    }
    createDealMutation.mutate();
  };

  const handleEditCategory = (category: ApiAdminMenuResponse["categories"][number]) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      position: category.position ?? 0,
      isActive: category.isActive ?? true,
    });
  };

  const handleEditAddOn = (addOn: ApiAdminMenuResponse["addOns"][number]) => {
    setEditingAddOnId(addOn.id);
    setAddOnForm({
      categoryId: addOn.categoryId ?? categories[0]?.id ?? "",
      name: addOn.name,
      price: (addOn.priceCents / 100).toFixed(2),
      isActive: addOn.isActive ?? true,
    });
  };

  const handleEditDeal = (deal: ApiDeal) => {
    setEditingDealId(deal.id);
    setDealForm({
      name: deal.name,
      description: deal.description,
      tag: deal.tag,
      imageUrl: deal.imageUrl ?? "",
      discount: deal.discountCents > 0 ? (deal.discountCents / 100).toFixed(2) : "",
      bundleItemQuantities: Object.fromEntries(
        deal.bundleItems.map((bundleItem) => [bundleItem.id, bundleItem.quantity]),
      ),
      isActive: deal.isActive,
    });
  };

  const isCategoryFormBusy =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    deleteCategoryMutation.isPending;
  const isAddOnFormBusy =
    createAddOnMutation.isPending ||
    updateAddOnMutation.isPending ||
    deleteAddOnMutation.isPending;
  const isProductFormBusy = createItemMutation.isPending || updateItemMutation.isPending;
  const isDealFormBusy =
    createDealMutation.isPending || updateDealMutation.isPending || deleteDealMutation.isPending;

  const isProductFormValid =
    itemForm.categoryId && itemForm.name.trim() && itemForm.description.trim() && itemForm.price.trim();
  const isDealFormValid =
    dealForm.name.trim() &&
    dealForm.description.trim() &&
    Object.values(dealForm.bundleItemQuantities).some((quantity) => quantity > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-foreground">Product Management</h1>
        <p className="text-sm text-muted-foreground">
          {sectionTitle} overview and controls.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading menu...</p>}

      {activeSection === "products" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 pl-9"
              />
            </div>
            <select
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground sm:w-56"
              value={productCategoryFilter}
              onChange={(event) => setProductCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Button className="rounded-full" onClick={handleOpenCreateProductDialog}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>

          <div className="rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4">Image</th>
                    <th className="px-5 py-4">Item</th>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Price</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td className="px-5 py-6 text-muted-foreground" colSpan={6}>
                        No products yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map(({ category, item }) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-4">
                          <img
                            src={item.imageUrl ?? heroBurger}
                            alt={item.name}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        </td>
                        <td className="px-5 py-4 font-semibold text-foreground">{item.name}</td>
                        <td className="px-5 py-4 text-muted-foreground max-w-xs">
                          {item.description}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{category.name}</td>
                        <td className="px-5 py-4 font-semibold text-foreground">
                          {formatCurrency(item.priceCents)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditProductDialog(item, category.id)}
                              disabled={isProductFormBusy}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!window.confirm(`Delete product "${item.name}"?`)) return;
                                deleteItemMutation.mutate(item.id);
                              }}
                              disabled={deleteItemMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              currentPage={productsPagination.currentPage}
              totalPages={productsPagination.totalPages}
              totalItems={productsPagination.totalItems}
              startItem={productsPagination.startItem}
              endItem={productsPagination.endItem}
              label="product"
              onPageChange={productsPagination.setCurrentPage}
            />
          </div>

          <Dialog open={isProductDialogOpen} onOpenChange={handleProductDialogOpenChange}>
            <DialogContent className="w-[92vw] max-w-2xl rounded-2xl sm:rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-foreground">
                    {editingItemId ? "Edit Product" : "Add Product"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {editingItemId
                      ? "Update the selected menu item."
                      : "Add a new menu item for Burger Guys."}
                  </p>
                </div>
                <DialogClose asChild>
                  <Button variant="ghost" className="rounded-full">
                    Close
                  </Button>
                </DialogClose>
              </div>

              <div className="mt-6 grid gap-5">
                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  Category
                  <select
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
                    value={itemForm.categoryId}
                    onChange={(event) => setItemForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  Item name
                  <Input
                    placeholder="e.g. Star Burger"
                    value={itemForm.name}
                    onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="h-11 rounded-xl"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  Description
                  <Textarea
                    placeholder="Short description of the item"
                    value={itemForm.description}
                    onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={4}
                    className="rounded-xl"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-foreground">
                    Price
                    <Input
                      placeholder="e.g. 5.99"
                      value={itemForm.price}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, price: event.target.value }))}
                      className="h-11 rounded-xl"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-foreground">
                    Image URL
                    <Input
                      placeholder="https://"
                      value={itemForm.imageUrl}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                      className="h-11 rounded-xl"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-full">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  className="btn-order rounded-full"
                  onClick={() => {
                    if (editingItemId) {
                      updateItemMutation.mutate(editingItemId);
                      return;
                    }
                    createItemMutation.mutate();
                  }}
                  disabled={!isProductFormValid || isProductFormBusy}
                >
                  {isProductFormBusy
                    ? "Saving..."
                    : editingItemId
                      ? "Update Product"
                      : "Add Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {activeSection === "categories" && (
        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl text-foreground mb-4">
              {editingCategoryId ? "Edit Category" : "Add Category"}
            </h2>
            <div className="space-y-3">
              <Input
                placeholder="Category name"
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <Input
                type="number"
                placeholder="Position"
                value={categoryForm.position}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, position: Number(event.target.value) }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categoryForm.isActive}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Active
              </label>
              <Button
                className="w-full"
                onClick={handleCategorySubmit}
                disabled={!categoryForm.name || isCategoryFormBusy}
              >
                {isCategoryFormBusy
                  ? "Saving..."
                  : editingCategoryId
                    ? "Update Category"
                    : "Add Category"}
              </Button>
              {editingCategoryId ? (
                <Button className="w-full" variant="outline" onClick={resetCategoryForm}>
                  Cancel Edit
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl text-foreground mb-4">Current Categories</h2>
            <div className="space-y-3 text-sm">
              {categories.length === 0 ? (
                <p className="text-muted-foreground">No categories yet.</p>
              ) : (
                paginatedCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                    <div>
                      <span className="font-semibold text-foreground">{category.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {category.items.length} items
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        disabled={isCategoryFormBusy}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!window.confirm(`Delete category "${category.name}"?`)) return;
                          deleteCategoryMutation.mutate(category.id);
                        }}
                        disabled={deleteCategoryMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <PaginationFooter
              currentPage={categoriesPagination.currentPage}
              totalPages={categoriesPagination.totalPages}
              totalItems={categoriesPagination.totalItems}
              startItem={categoriesPagination.startItem}
              endItem={categoriesPagination.endItem}
              label="category"
              onPageChange={categoriesPagination.setCurrentPage}
            />
          </div>
        </div>
      )}

      {activeSection === "addons" && (
        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl text-foreground mb-4">
              {editingAddOnId ? "Edit Add-on" : "Add Add-on"}
            </h2>
            <div className="space-y-3">
              <label className="grid gap-2 text-sm font-semibold text-foreground">
                Category
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
                  value={addOnForm.categoryId}
                  onChange={(event) =>
                    setAddOnForm((prev) => ({ ...prev, categoryId: event.target.value }))
                  }
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                placeholder="Add-on name"
                value={addOnForm.name}
                onChange={(event) => setAddOnForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <Input
                placeholder="Price (e.g. 1.99)"
                value={addOnForm.price}
                onChange={(event) => setAddOnForm((prev) => ({ ...prev, price: event.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addOnForm.isActive}
                  onChange={(event) => setAddOnForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Active
              </label>
              <Button
                className="w-full"
                onClick={handleAddOnSubmit}
                disabled={
                  !addOnForm.categoryId ||
                  !addOnForm.name ||
                  !addOnForm.price ||
                  isAddOnFormBusy
                }
              >
                {isAddOnFormBusy
                  ? "Saving..."
                  : editingAddOnId
                    ? "Update Add-on"
                    : "Add Add-on"}
              </Button>
              {editingAddOnId ? (
                <Button className="w-full" variant="outline" onClick={resetAddOnForm}>
                  Cancel Edit
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl text-foreground mb-4">Current Add-ons</h2>
            <div className="space-y-3 text-sm">
              {addOns.length === 0 ? (
                <p className="text-muted-foreground">No add-ons yet.</p>
              ) : (
                paginatedAddOns.map((addOn) => (
                  <div key={addOn.id} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                    <div>
                      <span className="font-semibold text-foreground">{addOn.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {addOn.category?.name ?? "All categories"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(addOn.priceCents)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAddOn(addOn)}
                        disabled={isAddOnFormBusy}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!window.confirm(`Delete add-on "${addOn.name}"?`)) return;
                          deleteAddOnMutation.mutate(addOn.id);
                        }}
                        disabled={deleteAddOnMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <PaginationFooter
              currentPage={addOnsPagination.currentPage}
              totalPages={addOnsPagination.totalPages}
              totalItems={addOnsPagination.totalItems}
              startItem={addOnsPagination.startItem}
              endItem={addOnsPagination.endItem}
              label="add-on"
              onPageChange={addOnsPagination.setCurrentPage}
            />
          </div>
        </div>
      )}

      {activeSection === "deals" && (
        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl text-foreground mb-4">
              {editingDealId ? "Edit Deal" : "Create Deal"}
            </h2>
            <div className="space-y-3">
              <Input
                placeholder="Deal name"
                value={dealForm.name}
                onChange={(event) => setDealForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <Textarea
                placeholder="Deal description"
                value={dealForm.description}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Tag (e.g. Best Seller)"
                  value={dealForm.tag}
                  onChange={(event) => setDealForm((prev) => ({ ...prev, tag: event.target.value }))}
                />
                <Input
                  placeholder="Discount amount (e.g. 2.50)"
                  value={dealForm.discount}
                  onChange={(event) =>
                    setDealForm((prev) => ({ ...prev, discount: event.target.value }))
                  }
                />
              </div>
              <Input
                placeholder="Image URL (optional)"
                value={dealForm.imageUrl}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dealForm.isActive}
                  onChange={(event) =>
                    setDealForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                Active
              </label>

              <div className="rounded-2xl border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Set quantity per deal item
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {dealItemOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No menu items available.</p>
                  ) : (
                    dealItemOptions.map((item) => {
                      const quantity = dealForm.bundleItemQuantities[item.id] ?? 0;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(item.priceCents)}
                            </span>
                            <Input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              className="h-9 w-20"
                              value={quantity === 0 ? "" : String(quantity)}
                              placeholder="0"
                              onChange={(event) =>
                                handleDealItemQuantityChange(item.id, event.target.value)
                              }
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleDealSubmit}
                disabled={!isDealFormValid || isDealFormBusy}
              >
                {isDealFormBusy ? "Saving..." : editingDealId ? "Update Deal" : "Create Deal"}
              </Button>
              {editingDealId ? (
                <Button className="w-full" variant="outline" onClick={resetDealForm}>
                  Cancel Edit
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl text-foreground mb-4">Current Deals</h2>
            <div className="space-y-3 text-sm">
              {deals.length === 0 ? (
                <p className="text-muted-foreground">No deals configured yet.</p>
              ) : (
                paginatedDeals.map((deal) => {
                  const savingCents = Math.max(0, deal.subtotalCents - deal.finalPriceCents);
                  const totalBundleItemCount = deal.bundleItems.reduce(
                    (sum, item) => sum + item.quantity,
                    0,
                  );
                  return (
                    <div
                      key={deal.id}
                      className="rounded-2xl border border-border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{deal.name}</p>
                          <p className="text-xs text-muted-foreground">{deal.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDeal(deal)}
                            disabled={isDealFormBusy}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!window.confirm(`Delete deal "${deal.name}"?`)) return;
                              deleteDealMutation.mutate(deal.id);
                            }}
                            disabled={deleteDealMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border px-2 py-1">
                          {deal.tag}
                        </span>
                        <span>{totalBundleItemCount} items</span>
                        <span>Price: {formatCurrency(deal.finalPriceCents)}</span>
                        {savingCents > 0 ? (
                          <span>Save: {formatCurrency(savingCents)}</span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {deal.bundleItems.map((item) => (
                          <span
                            key={`${deal.id}-${item.id}`}
                            className="rounded-full border border-border px-2 py-1"
                          >
                            {item.name} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <PaginationFooter
              currentPage={dealsPagination.currentPage}
              totalPages={dealsPagination.totalPages}
              totalItems={dealsPagination.totalItems}
              startItem={dealsPagination.startItem}
              endItem={dealsPagination.endItem}
              label="deal"
              onPageChange={dealsPagination.setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;

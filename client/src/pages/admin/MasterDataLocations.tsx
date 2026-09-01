/**
 * Master Data - Locations Management
 * Countries & Cities CRUD with inline editing
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function MasterDataLocations() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [citySearch, setCitySearch] = useState("");

  const [countryDialogOpen, setCountryDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<any>(null);
  const [countryForm, setCountryForm] = useState({ name: "", iso2: "", iso3: "", dialCode: "", currency: "" });

  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  const [cityForm, setCityForm] = useState({ name: "", countryId: 0, latitude: "", longitude: "" });

  const countriesQuery = trpc.admin.masterData.listCountries.useQuery(
    { search: search || undefined, includeInactive: true },
  );
  const citiesQuery = trpc.admin.masterData.listCities.useQuery(
    { countryId: selectedCountryId || undefined, search: citySearch || undefined, includeInactive: true },
    { enabled: !!selectedCountryId },
  );

  const utils = trpc.useUtils();
  const createCountry = trpc.admin.masterData.createCountry.useMutation({
    onSuccess: () => { utils.admin.masterData.listCountries.invalidate(); toast({ title: "Country created" }); setCountryDialogOpen(false); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateCountry = trpc.admin.masterData.updateCountry.useMutation({
    onSuccess: () => { utils.admin.masterData.listCountries.invalidate(); toast({ title: "Country updated" }); setCountryDialogOpen(false); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteCountry = trpc.admin.masterData.deleteCountry.useMutation({
    onSuccess: () => { utils.admin.masterData.listCountries.invalidate(); if (selectedCountryId) setSelectedCountryId(null); toast({ title: "Country deleted" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const createCity = trpc.admin.masterData.createCity.useMutation({
    onSuccess: () => { utils.admin.masterData.listCities.invalidate(); utils.admin.masterData.listCountries.invalidate(); toast({ title: "City created" }); setCityDialogOpen(false); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateCity = trpc.admin.masterData.updateCity.useMutation({
    onSuccess: () => { utils.admin.masterData.listCities.invalidate(); toast({ title: "City updated" }); setCityDialogOpen(false); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteCity = trpc.admin.masterData.deleteCity.useMutation({
    onSuccess: () => { utils.admin.masterData.listCities.invalidate(); utils.admin.masterData.listCountries.invalidate(); toast({ title: "City deleted" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const countryList = countriesQuery.data || [];
  const cityList = citiesQuery.data || [];
  const selectedCountry = countryList.find((c: any) => c.id === selectedCountryId);

  const openAddCountry = () => { setEditingCountry(null); setCountryForm({ name: "", iso2: "", iso3: "", dialCode: "", currency: "" }); setCountryDialogOpen(true); };
  const openEditCountry = (country: any) => { setEditingCountry(country); setCountryForm({ name: country.name || "", iso2: country.iso2 || "", iso3: country.iso3 || "", dialCode: country.dialCode || "", currency: country.currency || "" }); setCountryDialogOpen(true); };
  const saveCountry = () => {
    if (!countryForm.name.trim()) return;
    if (editingCountry) {
      updateCountry.mutate({ id: editingCountry.id, ...countryForm, iso2: countryForm.iso2 || undefined, iso3: countryForm.iso3 || undefined, dialCode: countryForm.dialCode || undefined, currency: countryForm.currency || undefined });
    } else {
      createCountry.mutate({ ...countryForm, iso2: countryForm.iso2 || undefined, iso3: countryForm.iso3 || undefined, dialCode: countryForm.dialCode || undefined, currency: countryForm.currency || undefined });
    }
  };
  const toggleCountryActive = (country: any) => { updateCountry.mutate({ id: country.id, isActive: country.isActive ? 0 : 1 }); };

  const openAddCity = () => { setEditingCity(null); setCityForm({ name: "", countryId: selectedCountryId || 0, latitude: "", longitude: "" }); setCityDialogOpen(true); };
  const openEditCity = (city: any) => { setEditingCity(city); setCityForm({ name: city.name || "", countryId: city.countryId || 0, latitude: city.latitude?.toString() || "", longitude: city.longitude?.toString() || "" }); setCityDialogOpen(true); };
  const saveCity = () => {
    if (!cityForm.name.trim() || !cityForm.countryId) return;
    const data = { name: cityForm.name, countryId: cityForm.countryId, latitude: cityForm.latitude ? parseFloat(cityForm.latitude) : undefined, longitude: cityForm.longitude ? parseFloat(cityForm.longitude) : undefined };
    if (editingCity) { updateCity.mutate({ id: editingCity.id, ...data }); } else { createCity.mutate(data); }
  };
  const toggleCityActive = (city: any) => { updateCity.mutate({ id: city.id, isActive: city.isActive ? 0 : 1 }); };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Locations</h1>
            <p className="text-sm text-[#697386] mt-1">Manage countries and cities for job listings, companies, and other entities</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Countries Panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5 text-[#0066FF]" />
                  Countries
                  <Badge variant="secondary" className="ml-2">{countryList.length}</Badge>
                </CardTitle>
                <Button size="sm" onClick={openAddCountry} className="bg-[#0066FF] hover:bg-[#0052CC]">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                <Input placeholder="Search countries..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {countryList.length === 0 ? (
                  <div className="p-8 text-center text-[#697386] text-sm">No countries found</div>
                ) : (
                  <div className="divide-y">
                    {countryList.map((country: any) => (
                      <div
                        key={country.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selectedCountryId === country.id ? "bg-[#F0F7FF] border-l-2 border-[#0052CC]" : "hover:bg-[#F7F8FA]"} ${!country.isActive ? "opacity-50" : ""}`}
                        onClick={() => setSelectedCountryId(country.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-[#1A1F36] truncate">{country.name}</span>
                            {country.iso2 && <Badge variant="outline" className="text-xs">{country.iso2}</Badge>}
                            {!country.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-[#697386]">
                            {country.dialCode && <span>{country.dialCode}</span>}
                            {country.currency && <span>{country.currency}</span>}
                            <span>{country.cityCount} cities</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleCountryActive(country); }}>
                            {country.isActive ? <ToggleRight className="h-4 w-4 text-[#0066FF]" /> : <ToggleLeft className="h-4 w-4 text-[#9BA3B0]" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditCountry(country); }}>
                            <Pencil className="h-3.5 w-3.5 text-[#697386]" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${country.name}?`)) deleteCountry.mutate({ id: country.id }); }}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#C8CDD6] flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cities Panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-[#0066FF]" />
                  Cities
                  {selectedCountry && <span className="text-sm font-normal text-[#697386]">— {selectedCountry.name}</span>}
                  {selectedCountryId && <Badge variant="secondary" className="ml-2">{cityList.length}</Badge>}
                </CardTitle>
                {selectedCountryId && (
                  <Button size="sm" onClick={openAddCity} className="bg-[#0066FF] hover:bg-[#0052CC]">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                )}
              </div>
              {selectedCountryId && (
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                  <Input placeholder="Search cities..." value={citySearch} onChange={(e) => setCitySearch(e.target.value)} className="pl-9 h-9" />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {!selectedCountryId ? (
                  <div className="p-8 text-center text-[#697386] text-sm">
                    <Globe className="h-10 w-10 mx-auto mb-2 text-[#C8CDD6]" />
                    Select a country to view its cities
                  </div>
                ) : cityList.length === 0 ? (
                  <div className="p-8 text-center text-[#697386] text-sm">
                    <MapPin className="h-10 w-10 mx-auto mb-2 text-[#C8CDD6]" />
                    No cities found for {selectedCountry?.name}
                    <br />
                    <Button size="sm" variant="outline" className="mt-3" onClick={openAddCity}>
                      <Plus className="h-4 w-4 mr-1" /> Add First City
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {cityList.map((city: any) => (
                      <div key={city.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-[#F7F8FA] transition-colors ${!city.isActive ? "opacity-50" : ""}`}>
                        <MapPin className="h-4 w-4 text-[#9BA3B0] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-[#1A1F36]">{city.name}</span>
                          {!city.isActive && <Badge variant="secondary" className="ml-2 text-xs">Inactive</Badge>}
                          {(city.latitude || city.longitude) && (
                            <div className="text-xs text-[#9BA3B0] mt-0.5">{city.latitude?.toFixed(4)}, {city.longitude?.toFixed(4)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleCityActive(city)}>
                            {city.isActive ? <ToggleRight className="h-4 w-4 text-[#0066FF]" /> : <ToggleLeft className="h-4 w-4 text-[#9BA3B0]" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCity(city)}>
                            <Pencil className="h-3.5 w-3.5 text-[#697386]" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`Delete ${city.name}?`)) deleteCity.mutate({ id: city.id }); }}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Country Dialog */}
      <Dialog open={countryDialogOpen} onOpenChange={setCountryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCountry ? "Edit Country" : "Add Country"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1A1F36]">Country Name *</label>
              <Input value={countryForm.name} onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })} placeholder="e.g. United Arab Emirates" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1A1F36]">ISO2 Code</label>
                <Input value={countryForm.iso2} onChange={(e) => setCountryForm({ ...countryForm, iso2: e.target.value.toUpperCase().slice(0, 2) })} placeholder="AE" maxLength={2} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1A1F36]">ISO3 Code</label>
                <Input value={countryForm.iso3} onChange={(e) => setCountryForm({ ...countryForm, iso3: e.target.value.toUpperCase().slice(0, 3) })} placeholder="ARE" maxLength={3} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1A1F36]">Dial Code</label>
                <Input value={countryForm.dialCode} onChange={(e) => setCountryForm({ ...countryForm, dialCode: e.target.value })} placeholder="+971" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1A1F36]">Currency</label>
                <Input value={countryForm.currency} onChange={(e) => setCountryForm({ ...countryForm, currency: e.target.value })} placeholder="AED" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCountryDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCountry} className="bg-[#0066FF] hover:bg-[#0052CC]" disabled={!countryForm.name.trim()}>{editingCountry ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* City Dialog */}
      <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCity ? "Edit City" : "Add City"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1A1F36]">City Name *</label>
              <Input value={cityForm.name} onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })} placeholder="e.g. Dubai" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1A1F36]">Country *</label>
              <Select value={cityForm.countryId?.toString() || ""} onValueChange={(v) => setCityForm({ ...cityForm, countryId: parseInt(v) })}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {countryList.filter((c: any) => c.isActive).map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1A1F36]">Latitude</label>
                <Input type="number" step="any" value={cityForm.latitude} onChange={(e) => setCityForm({ ...cityForm, latitude: e.target.value })} placeholder="25.2048" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1A1F36]">Longitude</label>
                <Input type="number" step="any" value={cityForm.longitude} onChange={(e) => setCityForm({ ...cityForm, longitude: e.target.value })} placeholder="55.2708" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCityDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCity} className="bg-[#0066FF] hover:bg-[#0052CC]" disabled={!cityForm.name.trim() || !cityForm.countryId}>{editingCity ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

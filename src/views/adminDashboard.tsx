import React from "react";
import View from "./view";
import { useNavigate } from "react-router-dom";
import NotFound from "./notFound";
import Button from "../components/button";
import { pizzaService } from "../service/service";
import {
  Franchise,
  FranchiseList,
  Role,
  Store,
  User,
} from "../service/pizzaService";
import { TrashIcon } from "../icons";

interface Props {
  user: User | null;
}

export default function AdminDashboard(props: Props) {
  const navigate = useNavigate();
  const [franchiseList, setFranchiseList] = React.useState<FranchiseList>({
    franchises: [],
    more: false,
  });
  const [franchisePage, setFranchisePage] = React.useState(0);
  const [franchiseFilter, setFranchiseFilter] = React.useState("*");
  const [activeTab, setActiveTab] = React.useState<"franchises" | "users">(
    "franchises"
  );
  const [userData, setUserData] = React.useState<{
    users: User[];
    more: boolean;
  }>({ users: [], more: false });
  const [userPage, setUserPage] = React.useState(0);
  const [userFilter, setUserFilter] = React.useState("*");
  const filterFranchiseRef = React.useRef<HTMLInputElement>(null);
  const filterUserRef = React.useRef<HTMLInputElement>(null);
  const isAdmin = Role.isRole(props.user, Role.Admin);

  React.useEffect(() => {
    if (!isAdmin) {
      return;
    }

    (async () => {
      setFranchiseList(
        await pizzaService.getFranchises(franchisePage, 3, franchiseFilter)
      );
    })();
  }, [isAdmin, franchisePage, franchiseFilter]);

  React.useEffect(() => {
    if (!isAdmin || activeTab !== "users") {
      return;
    }

    (async () => {
      setUserData(await pizzaService.getUsers(userPage, 10, userFilter));
    })();
  }, [isAdmin, activeTab, userPage, userFilter]);

  function createFranchise() {
    navigate("/admin-dashboard/create-franchise");
  }

  async function closeFranchise(franchise: Franchise) {
    navigate("/admin-dashboard/close-franchise", {
      state: { franchise: franchise },
    });
  }

  async function closeStore(franchise: Franchise, store: Store) {
    navigate("/admin-dashboard/close-store", {
      state: { franchise: franchise, store: store },
    });
  }

  function filterFranchises() {
    const filterValue = filterFranchiseRef.current?.value?.trim() ?? "";
    setFranchiseFilter(filterValue ? `*${filterValue}*` : "*");
    setFranchisePage(0);
  }

  function filterUsers() {
    const filterValue = filterUserRef.current?.value?.trim() ?? "";
    setUserFilter(filterValue ? `*${filterValue}*` : "*");
    setUserPage(0);
  }

  async function deleteUserRow(user: User) {
    if (!user.id) {
      return;
    }

    await pizzaService.deleteUser(user.id);
    const updated = await pizzaService.getUsers(userPage, 10, userFilter);

    if (updated.users.length === 0 && userPage > 0) {
      const previous = await pizzaService.getUsers(
        userPage - 1,
        10,
        userFilter
      );
      setUserPage(userPage - 1);
      setUserData(previous);
      return;
    }

    setUserData(updated);
  }

  let response = <NotFound />;
  if (isAdmin) {
    response = (
      <View title="Mama Ricci's kitchen">
        <div className="text-start py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 border-b border-gray-300 mb-6">
            {[
              { id: "franchises" as const, label: "Franchises" },
              { id: "users" as const, label: "Users" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-orange-500 text-orange-500"
                    : "border-transparent text-neutral-200 hover:text-orange-400"
                }`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "users") {
                    setUserPage(0);
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "franchises" ? (
            <>
              <h3 className="text-neutral-100 text-xl">Franchises</h3>
              <div className="bg-neutral-100 overflow-clip my-4">
                <div className="flex flex-col">
                  <div className="-m-1.5 overflow-x-auto">
                    <div className="p-1.5 min-w-full inline-block align-middle">
                      <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                            <tr>
                              {[
                                "Franchise",
                                "Franchisee",
                                "Store",
                                "Revenue",
                                "Action",
                              ].map((header) => (
                                <th
                                  key={header}
                                  scope="col"
                                  className="px-6 py-3 text-center text-xs font-medium"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          {franchiseList.franchises.map((franchise, findex) => (
                            <tbody
                              key={findex}
                              className="divide-y divide-gray-200"
                            >
                              <tr className="border-neutral-500 border-t-2">
                                <td className="text-start px-2 whitespace-nowrap text-l font-mono text-orange-600">
                                  {franchise.name}
                                </td>
                                <td
                                  className="text-start px-2 whitespace-nowrap text-sm font-normal text-gray-800"
                                  colSpan={3}
                                >
                                  {franchise.admins
                                    ?.map((o) => o.name)
                                    .join(", ")}
                                </td>
                                <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                                  <button
                                    type="button"
                                    className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400  hover:border-orange-800 hover:text-orange-800"
                                    onClick={() => closeFranchise(franchise)}
                                  >
                                    <TrashIcon />
                                    Close
                                  </button>
                                </td>
                              </tr>
                              {franchise.stores.map((store, sindex) => (
                                <tr key={sindex} className="bg-neutral-100">
                                  <td
                                    className="text-end px-2 whitespace-nowrap text-sm text-gray-800"
                                    colSpan={3}
                                  >
                                    {store.name}
                                  </td>
                                  <td className="text-end px-2 whitespace-nowrap text-sm text-gray-800">
                                    {store.totalRevenue?.toLocaleString()} ₿
                                  </td>
                                  <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                                    <button
                                      type="button"
                                      className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                                      onClick={() =>
                                        closeStore(franchise, store)
                                      }
                                    >
                                      <TrashIcon />
                                      Close
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          ))}
                          <tfoot>
                            <tr>
                              <td className="px-1 py-1">
                                <input
                                  type="text"
                                  ref={filterFranchiseRef}
                                  name="filterFranchise"
                                  placeholder="Filter franchises"
                                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                                />
                                <button
                                  type="button"
                                  className="ml-2 px-2 py-1 text-sm font-semibold rounded-lg border border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                                  onClick={filterFranchises}
                                >
                                  Search Franchises
                                </button>
                              </td>
                              <td
                                colSpan={4}
                                className="text-end text-sm font-medium"
                              >
                                <button
                                  className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300 "
                                  onClick={() =>
                                    setFranchisePage(franchisePage - 1)
                                  }
                                  disabled={franchisePage <= 0}
                                >
                                  «
                                </button>
                                <button
                                  className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300"
                                  onClick={() =>
                                    setFranchisePage(franchisePage + 1)
                                  }
                                  disabled={!franchiseList.more}
                                >
                                  »
                                </button>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-neutral-100 text-xl">Users</h3>
              <div className="bg-neutral-100 overflow-clip my-4">
                <div className="flex flex-col">
                  <div className="-m-1.5 overflow-x-auto">
                    <div className="p-1.5 min-w-full inline-block align-middle">
                      <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                            <tr>
                              {["Name", "Email", "Roles", "Action"].map(
                                (header) => (
                                  <th
                                    key={header}
                                    scope="col"
                                    className="px-6 py-3 text-center text-xs font-medium"
                                  >
                                    {header}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {userData.users.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-6 text-center text-sm text-gray-600"
                                >
                                  No users found.
                                </td>
                              </tr>
                            ) : (
                              userData.users.map((user, index) => (
                                <tr key={user.id ?? index}>
                                  <td className="px-4 py-2 text-sm text-gray-800">
                                    {user.name}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-800">
                                    {user.email}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-800">
                                    {user.roles
                                      ?.map((role) => role.role)
                                      .join(", ") || "—"}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right">
                                    <button
                                      type="button"
                                      className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                                      onClick={() => deleteUserRow(user)}
                                    >
                                      <TrashIcon />
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td className="px-1 py-1" colSpan={2}>
                                <input
                                  type="text"
                                  ref={filterUserRef}
                                  name="filterUsers"
                                  placeholder="Search users"
                                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                                />
                                <button
                                  type="button"
                                  className="ml-2 px-2 py-1 text-sm font-semibold rounded-lg border border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                                  onClick={filterUsers}
                                >
                                  Search Users
                                </button>
                              </td>
                              <td
                                colSpan={2}
                                className="text-end text-sm font-medium"
                              >
                                <button
                                  className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300 "
                                  onClick={() => setUserPage(userPage - 1)}
                                  disabled={userPage <= 0}
                                >
                                  «
                                </button>
                                <button
                                  className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300"
                                  onClick={() => setUserPage(userPage + 1)}
                                  disabled={!userData.more}
                                >
                                  »
                                </button>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {activeTab === "franchises" && (
          <div>
            <Button
              className="w-36 text-xs sm:text-sm sm:w-64"
              title="Add Franchise"
              onPress={createFranchise}
            />
          </div>
        )}
      </View>
    );
  }

  return response;
}

import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useHistory } from "react-router-dom";
import { Button, Snackbar } from '@material-ui/core';
import MessageIcon from '@material-ui/icons/Message';
import { FileCopyOutlined } from "@material-ui/icons";
import PageTitle from '../../layout-components/PageTitle';
import CustomTable from '../../components/CustomTable';
import { useEvernode } from '../../services/Evernode';
import Loader from '../../components/Loader';
import CountryFlag from '../../business-components/CountryFlag';
import CPUModel from '../../business-components/CPUModel';
import InstanceSpecs from '../../business-components/InstanceSpecs';

const PAGE_SIZE = 10;

export default function Hosts() {
  const history = useHistory();
  const evernode = useEvernode();

  const [open, setOpen] = useState(false);
  const [hosts, setHosts] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [pageQueue, setPageQueue] = useState([]);
  const [isHostsLoading, setIsHostsLoading] = useState(false);

  const handleClick = (address) => {
    setOpen(true);
    navigator.clipboard.writeText(address);
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);
  };

  const loadHosts = useCallback(async (pageToken = null) => {
    const data = await evernode.getHosts(null, PAGE_SIZE, pageToken);
    let hostList;
    if (data.nextPageToken) {
      hostList = data.data;
      setNextPageToken(data.nextPageToken);
    }
    else {
      hostList = data;
      setNextPageToken(null);
    }

    const tableColumns = {
      address: { title: "Address", className: 'text-start' },
      status: { title: "Status", className: 'text-center' },
      cpuModel: { title: "CPU Model", className: 'text-center col-fixed-mw' },
      instanceSize: { title: "Instance Size", className: 'text-center col-fixed-mw' },
      maxInstances: { title: "Max Instances", className: 'text-center' },
      activeInstances: { title: "Active Instances", className: 'text-center' }
    };
    const tableValues = hostList.map(host => {
      return {
        key: host.address,
        address: <div className="d-flex align-items-center">
          <CountryFlag countryCode={host.countryCode} size="3em" />
          <div className="ml-3">
            <p className="font-weight-bold m-0">
              {host.address}
              {host.hostMessage ? (
                <MessageIcon className="host-message-icon" fontSize="small" />
              ) : null}
              <Button onClick={(e) => { handleClick(host.address); e.stopPropagation(); }} className="copy-button ml-1"><FileCopyOutlined style={{ fontSize: 16 }} /></Button>
            </p>
            <span className="text-black-50 d-block py-1">
              {
                host.version &&
                <span className="text-span">v{host.version} | </span>
              }
              {
                host.domain &&
                <span>{host.domain}</span>
              }
            </span>
          </div>
        </div>,
        status: host.active ?
          <div className="h-auto py-2 badge badge-success" style={{ width: '4.25rem', fontSize: '0.75rem' }}>
            Active
          </div> :
          <div className="h-auto py-2 badge badge-warning" style={{ width: '4.25rem', fontSize: '0.75rem' }}>
            Inactive
          </div>,
        cpuModel: <CPUModel modelName={host.cpuModelName} speed={host.cpuMHz} count={host.cpuCount} />,
        instanceSize: <InstanceSpecs cpu={host.cpuMicrosec} ram={host.ramMb} disk={host.diskMb} instanceCount={host.maxInstances} />,
        maxInstances: host.maxInstances || 0,
        activeInstances: host.activeInstances || 0
      }
    });

    setHosts({
      hosts: hostList,
      tableColumns: tableColumns,
      tableValues: tableValues
    });

    setIsHostsLoading(false);
  }, [evernode]);

  useEffect(() => {
    loadHosts();
  }, [loadHosts]);

  const handleRowClick = useCallback((e) => {
    if (isHostsLoading)
      return;
    history.push(`/host/${e.key}`);
  }, [history, isHostsLoading]);

  const handleNextClick = useCallback(() => {
    setIsHostsLoading(true);
    setPageQueue([...pageQueue, nextPageToken]);
    loadHosts(nextPageToken);
  }, [loadHosts, pageQueue, nextPageToken]);

  const handlePrevClick = useCallback(() => {
    setIsHostsLoading(true);
    const prevPageToken = pageQueue.length > 1 ? pageQueue[pageQueue.length - 2] : null;
    setPageQueue(pageQueue.slice(0, pageQueue.length - 1));
    loadHosts(prevPageToken);
  }, [loadHosts, pageQueue]);

  return (
    <Fragment>
      <PageTitle
        titleHeading="Hosts"
      />
      {isHostsLoading && <Loader className={`hostsLoader "p-4"`} />}
      {(hosts && <div>
        <CustomTable columns={hosts.tableColumns} values={hosts.tableValues} blurTable={isHostsLoading} onRowClick={handleRowClick} />
        <div>
          {pageQueue.length > 0 && <Button className="pull-left" variant="contained" disabled={isHostsLoading} onClick={handlePrevClick}>Prev</Button>}
          {nextPageToken && <Button className="pull-right" variant="contained" disabled={isHostsLoading} onClick={handleNextClick}>Next</Button>}
        </div>
      </div>)}
      <Snackbar
        open={open}
        onClose={handleClose}
        autoHideDuration={1000}
        message="Copied to clipboard"
      />
    </Fragment>
  );
}
